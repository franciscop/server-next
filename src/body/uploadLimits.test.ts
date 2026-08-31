import server from "../index";
import { cleanupBuckets, count, realBucket } from "../tests/realBucket";

afterAll(cleanupBuckets);

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// One multipart body with any number of file parts
function multipart(files: { field: string; name: string; type: string; body: Buffer | string }[]) {
  const boundary = "b-limits";
  const chunks: Buffer[] = [];
  for (const f of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; ` +
          `filename="${f.name}"\r\nContent-Type: ${f.type}\r\n\r\n`,
      ),
      Buffer.isBuffer(f.body) ? f.body : Buffer.from(f.body),
      Buffer.from("\r\n"),
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    raw: Buffer.concat(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

const app = (uploads: any, extra: any = {}) =>
  server({ uploads, ...extra }).post("/", (ctx) => ({ body: ctx.body })).test();

describe("upload size limits", () => {
  it("defaults maxFileSize and maxTotalSize even for the string form", () => {
    const uploads = server({ uploads: "./src/tests/uploads/_limits" }).settings
      .uploads as any;
    expect(uploads.maxFileSize).toBe("10mb");
    expect(uploads.maxTotalSize).toBe("100mb");
  });

  it("rejects one file over maxFileSize, leaving nothing behind", async () => {
    const bucket = realBucket();
    const { raw, headers } = multipart([
      { field: "f", name: "big.bin", type: "application/octet-stream", body: "x".repeat(5000) },
    ]);
    const res = await app({ bucket, maxFileSize: "1kb" }).post("/", raw, { headers });
    expect(res.status).toBe(413);
    expect(await count(bucket)).toBe(0);
  });

  it("rejects on maxTotalSize when each part passes on its own", async () => {
    const bucket = realBucket();
    const part = { type: "application/octet-stream", body: "x".repeat(800) };
    const { raw, headers } = multipart([
      { field: "a", name: "a.bin", ...part },
      { field: "b", name: "b.bin", ...part },
      { field: "c", name: "c.bin", ...part },
    ]);
    const res = await app({ bucket, maxFileSize: "1kb", maxTotalSize: "2kb" }).post("/", raw, {
      headers,
    });
    expect(res.status).toBe(413);
  });

  it("caps a raw body by maxFileSize too", async () => {
    const bucket = realBucket();
    const res = await app({ bucket, maxFileSize: "1kb" }).post("/", "x".repeat(5000), {
      headers: { "content-type": "application/x-anything" },
    });
    expect(res.status).toBe(413);
    expect(await count(bucket)).toBe(0);
  });

  // The regression this restructure is most likely to cause: limits must be
  // enforced while streaming, never by buffering the file to measure it.
  it("still streams: a file far over maxBodySize uploads fine", async () => {
    const bucket = realBucket();
    const { raw, headers } = multipart([
      { field: "f", name: "big.bin", type: "application/octet-stream", body: "x".repeat(300_000) },
    ]);
    const res = await app({ bucket, maxFileSize: "10mb" }, {
      security: { maxBodySize: "1kb" },
    }).post("/", raw, { headers });
    expect(res.status).toBe(200);
    expect((await res.json()).body.f.size).toBe(300_000);
  });
});

describe("stored file naming", () => {
  it("names a sniffed file by what it actually is", async () => {
    const bucket = realBucket();
    // Declared as text, and named .txt, but the bytes are a PNG
    const { raw, headers } = multipart([
      { field: "f", name: "notes.txt", type: "text/plain", body: PNG },
    ]);
    const res = await app({ bucket }).post("/", raw, { headers });
    const file = (await res.json()).body.f;
    expect(file.path).toMatch(/\.png$/);
    expect(file.type).toBe("image/png");
    // The client's own name is kept, separately
    expect(file.name).toBe("notes.txt");
  });

  it("gives an unsniffable file no extension at all", async () => {
    const bucket = realBucket();
    const { raw, headers } = multipart([
      { field: "f", name: "evil.php", type: "text/csv", body: "id,name\n1,ada\n" },
    ]);
    const res = await app({ bucket }).post("/", raw, { headers });
    const file = (await res.json()).body.f;
    expect(file.path).not.toContain(".");
    expect(file.name).toBe("evil.php");
  });

  it("never lets the client choose the stored extension", async () => {
    const bucket = realBucket();
    const { raw, headers } = multipart([
      { field: "f", name: "shell.php", type: "application/x-httpd-php", body: "<?php ?>" },
    ]);
    const res = await app({ bucket }).post("/", raw, { headers });
    expect((await res.json()).body.f.path).not.toContain(".php");
  });
});

describe("fileType against the real bytes", () => {
  it("rejects a lie about a binary type", async () => {
    const { raw, headers } = multipart([
      { field: "f", name: "photo.png", type: "image/png", body: "not a png at all" },
    ]);
    const res = await app({ bucket: realBucket(), fileType: ["image/png"] }).post("/", raw, {
      headers,
    });
    expect(res.status).toBe(415);
  });

  it("accepts a real png declared as anything", async () => {
    const { raw, headers } = multipart([
      { field: "f", name: "x.bin", type: "application/octet-stream", body: PNG },
    ]);
    const res = await app({ bucket: realBucket(), fileType: ["image/png"] }).post("/", raw, {
      headers,
    });
    expect(res.status).toBe(200);
  });

  it("falls back to the claim for text, which cannot be sniffed", async () => {
    const { raw, headers } = multipart([
      { field: "f", name: "data.csv", type: "text/csv", body: "id,name\n1,ada\n" },
    ]);
    const res = await app({ bucket: realBucket(), fileType: ["text/csv"] }).post("/", raw, {
      headers,
    });
    expect(res.status).toBe(200);
  });
});

describe("a file with no uploads configured", () => {
  it("throws instead of silently dropping it", async () => {
    const { raw, headers } = multipart([
      { field: "avatar", name: "me.png", type: "image/png", body: PNG },
    ]);
    const res = await server().post("/", (ctx) => ctx.body).test().post("/", raw, { headers });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Server Error");
  });

  it("skips files when uploads is explicitly false", async () => {
    const { raw, headers } = multipart([
      { field: "avatar", name: "me.png", type: "image/png", body: PNG },
    ]);
    const res = await server({ uploads: false })
      .post("/", (ctx) => ctx.body)
      .test()
      .post("/", raw, { headers });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it("hands onError a code to branch on", async () => {
    let seen: any;
    const { raw, headers } = multipart([
      { field: "avatar", name: "me.png", type: "image/png", body: PNG },
    ]);
    await server({
      onError: (error: any) => {
        seen = error;
        return new Response("x", { status: 400 });
      },
    })
      .post("/", (ctx) => ctx.body)
      .test()
      .post("/", raw, { headers });
    expect(seen.code).toBe("UPLOAD_NOT_CONFIGURED");
  });
});

// A container format says less than the client's own claim: a .docx is a ZIP,
// and storing it as "application/zip" would throw away what it really is.
describe("container formats", () => {
  const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Array(40).fill(0)]);
  const DOCX =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  it("keeps a more specific claim over the container it sits in", async () => {
    const { raw, headers } = multipart([
      { field: "f", name: "report.docx", type: DOCX, body: ZIP },
    ]);
    const res = await app({ bucket: realBucket() }).post("/", raw, { headers });
    const file = (await res.json()).body.f;
    expect(file.type).toBe(DOCX);
    expect(file.path).toMatch(/\.docx$/);
  });

  it("still stores a plain zip as a zip", async () => {
    const { raw, headers } = multipart([
      { field: "f", name: "a.zip", type: "application/zip", body: ZIP },
    ]);
    const res = await app({ bucket: realBucket() }).post("/", raw, { headers });
    expect((await res.json()).body.f.path).toMatch(/\.zip$/);
  });

  it("does not let any claim ride on a container", async () => {
    const { raw, headers } = multipart([
      { field: "f", name: "x.png", type: "image/png", body: ZIP },
    ]);
    const res = await app({ bucket: realBucket() }).post("/", raw, { headers });
    // Not a specialisation of zip, so the bytes win
    expect((await res.json()).body.f.type).toBe("application/zip");
  });
});

// Thousands of tiny parts pass both size limits while creating thousands of
// objects, so the count is its own limit.
describe("maxFiles", () => {
  const many = (n: number) =>
    multipart(
      Array.from({ length: n }, (_, i) => ({
        field: `f${i}`,
        name: `a${i}.bin`,
        type: "application/octet-stream",
        body: "xx",
      })),
    );

  it("refuses a request with more files than allowed", async () => {
    const bucket = realBucket();
    const { raw, headers } = many(5);
    const res = await app({ bucket, maxFiles: 3 }).post("/", raw, { headers });
    expect(res.status).toBe(413);
    expect(await res.text()).toMatch(/files/i);
  });

  it("has a default, so an unconfigured uploads is bounded", () => {
    const uploads = server({ uploads: "./src/tests/uploads/_limits" }).settings
      .uploads as any;
    expect(uploads.maxFiles).toBe(100);
  });

  it("allows a request at the limit", async () => {
    const { raw, headers } = many(3);
    const res = await app({ bucket: realBucket(), maxFiles: 3 }).post("/", raw, {
      headers,
    });
    expect(res.status).toBe(200);
  });
});

// A body that says upfront it is too big should never reach the bucket
describe("Content-Length", () => {
  it("refuses an oversized raw body before writing anything", async () => {
    const bucket = realBucket();
    const res = await app({ bucket, maxFileSize: "1kb" }).post("/", "x".repeat(50_000), {
      headers: { "content-type": "application/x-anything" },
    });
    expect(res.status).toBe(413);
    expect(await count(bucket)).toBe(0);
  });
});
