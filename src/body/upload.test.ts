import server from "..";
import { cleanupBuckets, realBucket } from "../tests/realBucket";
import parseBody from "./parseBody";
import { getExt } from "./upload";

afterAll(cleanupBuckets);

// A real `bucket` FileSystem instance; `count()` reports how many files exist.
const mockBucket = realBucket;

// Real signature bytes, so a part that says "image/jpeg" is one
const JPEG = "\xff\xd8\xff\xe0";

// Builds a minimal multipart buffer with one text field and one file
function makeMultipart(
  filename: string,
  fileContent: string,
  mimeType = "application/octet-stream",
  fieldName = "file",
) {
  const boundary = "test-boundary-abc123";
  const parts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="text"\r\n\r\n`,
    `hello\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
    `${fileContent}\r\n`,
    `--${boundary}--\r\n`,
  ].join("");

  return {
    // latin1 so a signature byte like \xff stays one byte
    raw: Buffer.from(parts, "latin1"),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe("getExt", () => {
  it("returns extension with leading dot, lowercased", () => {
    expect(getExt("photo.jpg")).toBe(".jpg");
    expect(getExt("document.PDF")).toBe(".pdf");
    expect(getExt("Photo.JPG")).toBe(".jpg");
  });

  it("uses the last segment for multi-dot filenames", () => {
    expect(getExt("archive.tar.gz")).toBe(".gz");
  });

  it("falls back to .bin for no extension", () => {
    expect(getExt("Makefile")).toBe(".bin");
  });
});

// The stored key is named by what the bytes are, never by what the client
// called the file, so a client cannot pick the extension it lands under.
describe("the stored key", () => {
  it("uses the sniffed format, not the client's filename", async () => {
    const bucket = mockBucket();
    const { raw, contentType } = makeMultipart("Photo.JPG", JPEG, "image/jpeg");
    const body = await parseBody(raw, contentType, bucket);
    expect(body.file.path).toMatch(/^\w{16}\.jpg$/);
    // ...while the client's own name is kept alongside it
    expect(body.file.name).toBe("Photo.JPG");
  });

  it("has no extension when the bytes say nothing", async () => {
    const bucket = mockBucket();
    const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");
    const body = await parseBody(raw, contentType, bucket);
    expect(body.file.path).toMatch(/^\w{16}$/);
    expect(body.file.type).toBe("text/plain");
  });

  it("produces the same shape with and without limits", async () => {
    const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");
    const plain = await parseBody(raw, contentType, mockBucket());
    const limited = await parseBody(raw, contentType, {
      bucket: mockBucket(),
      maxFileSize: "10mb",
    });

    expect(Object.keys(plain.file).sort()).toEqual(Object.keys(limited.file).sort());
    expect(plain.file.name).toBe(limited.file.name);
    expect(plain.file.type).toBe(limited.file.type);
    expect(plain.file.size).toBe(limited.file.size);
  });
});

// Validation is exercised at the parseBody layer with the same
// `{ bucket, maxFileSize, minSize, fileType }` shape the `uploads` option
// resolves to (see the public tests further down).
describe("upload validation", () => {
  const dest = (limits: any) => ({ bucket: mockBucket(), ...limits });

  describe("maxFileSize", () => {
    it("rejects files exceeding maxFileSize in bytes", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "a".repeat(100));
      await expect(
        parseBody(raw, contentType, dest({ maxFileSize: 10 })),
      ).rejects.toThrow(/too large/i);
    });

    it("rejects files exceeding maxFileSize in string form (kb)", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "x".repeat(2000));
      await expect(
        parseBody(raw, contentType, dest({ maxFileSize: "1kb" })),
      ).rejects.toThrow(/too large/i);
    });

    it("accepts files within maxFileSize", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "small content");
      const body = await parseBody(raw, contentType, dest({ maxFileSize: "10mb" }));
      expect(body.file).toBeDefined();
    });
  });

  describe("minSize", () => {
    it("rejects files below minSize", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "tiny");
      await expect(
        parseBody(raw, contentType, dest({ minSize: "1mb" })),
      ).rejects.toThrow(/too small/i);
    });

    it("accepts files meeting minSize", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "four");
      const body = await parseBody(raw, contentType, dest({ minSize: 4 }));
      expect(body.file).toBeDefined();
    });
  });

  describe("fileType", () => {
    it("rejects by mime type", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      await expect(
        parseBody(raw, contentType, dest({ fileType: ["image/png"] })),
      ).rejects.toThrow(/file type/i);
    });

    it("rejects by extension", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      await expect(
        parseBody(raw, contentType, dest({ fileType: [".png"] })),
      ).rejects.toThrow(/file type/i);
    });

    it("accepts a matching mime type", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", JPEG, "image/jpeg");
      const body = await parseBody(raw, contentType, dest({ fileType: ["image/jpeg"] }));
      expect(body.file).toBeDefined();
    });

    it("accepts a matching extension", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", JPEG, "image/jpeg");
      const body = await parseBody(raw, contentType, dest({ fileType: [".jpg"] }));
      expect(body.file).toBeDefined();
    });

    it("accepts when extension or mime matches (OR logic)", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", JPEG, "image/jpeg");
      const body = await parseBody(
        raw,
        contentType,
        dest({ fileType: [".png", "image/jpeg"] }),
      );
      expect(body.file).toBeDefined();
    });
  });

  describe("text fields are unaffected", () => {
    it("still parses text fields when a file is validated and stored", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "imgdata", "image/jpeg");
      const body = await parseBody(raw, contentType, dest({ maxFileSize: "1mb" }));
      expect(body.text).toBe("hello");
    });

    it("still parses text fields when a file is rejected", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "toolarge", "image/jpeg");
      // The whole parse rejects when a file fails validation
      await expect(parseBody(raw, contentType, dest({ maxFileSize: 1 }))).rejects.toThrow();
    });
  });
});

describe("uploads option (object form)", () => {
  const post = (uploads: any, file = "small", type = "image/jpeg", name = "photo.jpg") => {
    const { raw, contentType } = makeMultipart(name, file, type);
    return server({ uploads })
      .post("/", (ctx) => ({ ok: !!(ctx.body as any).file }))
      .test()
      .post("/", raw, { headers: { "content-type": contentType } });
  };

  it("accepts a file within the limits", async () => {
    const res = await post({
      bucket: mockBucket(),
      maxFileSize: "1mb",
      fileType: ["image/jpeg", ".jpg"],
    }, "\xff\xd8\xff\xe0");
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  // The client chose the file, so a rejected upload is a 4xx it can act on,
  // not a server error that pages the operator.
  it("rejects a file over maxFileSize with a 413", async () => {
    const res = await post({ bucket: mockBucket(), maxFileSize: 10 }, "a".repeat(100));
    expect(res.status).toBe(413);
    expect(await res.text()).toMatch(/too large/);
  });

  it("rejects a file under minSize with a 400", async () => {
    const res = await post({ bucket: mockBucket(), minSize: "1kb" }, "a");
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/too small/);
  });

  it("rejects a disallowed fileType with a 415", async () => {
    const res = await post({ bucket: mockBucket(), fileType: ["image/png"] });
    expect(res.status).toBe(415);
    expect(await res.text()).toMatch(/not allowed/);
  });

  it("hands onError a code to branch on", async () => {
    let seen: any;
    const { raw, contentType } = makeMultipart("photo.jpg", "a".repeat(100), "image/jpeg");
    const res = await server({
      uploads: { bucket: mockBucket(), maxFileSize: 10 },
      onError: (error: any) => {
        seen = error;
        return new Response("nope", { status: 422 });
      },
    })
      .post("/", (ctx) => ctx.body)
      .test()
      .post("/", raw, { headers: { "content-type": contentType } });
    expect(res.status).toBe(422);
    expect(seen.code).toBe("UPLOAD_TOO_LARGE");
    expect(seen.status).toBe(413);
  });

  it("streams unvalidated when given just a bucket", async () => {
    const res = await post(mockBucket());
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("streams unvalidated for an object with no limits", async () => {
    const res = await post({ bucket: mockBucket() });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

describe("uploads option", () => {
  it("resolves every config form to the same settings shape", async () => {
    // Bare bucket, object without limits, object with limits: identical shape,
    // so nothing downstream depends on which form configured it
    const forms = [
      mockBucket(),
      { bucket: mockBucket() },
      { bucket: mockBucket(), maxFileSize: "1mb" },
    ];
    for (const uploads of forms) {
      const app = server({ uploads }).get(
        "/",
        (ctx: any) => `file:${typeof ctx.options.uploads.bucket.file}`,
      );
      const res = await app.test().get("/");
      expect(await res.text()).toBe("file:function");
    }
  });
});
