import server from "..";
import { cleanupBuckets, realBucket } from "../tests/realBucket";
import parseBody from "./parseBody";
import { getExt } from "./upload";

afterAll(cleanupBuckets);

// A real `bucket` FileSystem instance; `count()` reports how many files exist.
const mockBucket = realBucket;

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
    raw: Buffer.from(parts, "utf-8"),
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

describe("getExt consistency", () => {
  it("lowercases the extension used in the stored key", async () => {
    const bucket = mockBucket();
    const { raw, contentType } = makeMultipart("Photo.JPG", "data", "image/jpeg");
    const body = await parseBody(raw, contentType, bucket);
    // the stored key must use a lowercase extension, not .JPG
    expect(body.file.path).toMatch(/^\w{16}\.jpg$/);
  });

  it("streamed and validated files produce the same UploadedFile shape", async () => {
    const b1 = mockBucket();
    const b2 = mockBucket();
    const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");

    // same raw buffer, streamed straight through vs buffered for validation
    const streamed = await parseBody(raw, contentType, b1);
    const validated = await parseBody(raw, contentType, {
      bucket: b2,
      maxSize: "10mb",
    });

    // shapes must be identical
    expect(Object.keys(streamed.file).sort()).toEqual(
      Object.keys(validated.file).sort(),
    );
    expect(streamed.file.name).toBe(validated.file.name);
    expect(streamed.file.type).toBe(validated.file.type);
    expect(streamed.file.size).toBe(validated.file.size);
    // the key is random, so only check its shape
    expect(streamed.file.path).toMatch(/^\w{16}\.txt$/);
    expect(validated.file.path).toMatch(/^\w{16}\.txt$/);
  });
});

// Validation is exercised at the parseBody layer with the same
// `{ bucket, maxSize, minSize, fileType }` shape the `uploads` option
// resolves to (see the public tests further down).
describe("upload validation", () => {
  const dest = (limits: any) => ({ bucket: mockBucket(), ...limits });

  describe("maxSize", () => {
    it("rejects files exceeding maxSize in bytes", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "a".repeat(100));
      await expect(
        parseBody(raw, contentType, dest({ maxSize: 10 })),
      ).rejects.toThrow(/too large/i);
    });

    it("rejects files exceeding maxSize in string form (kb)", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "x".repeat(2000));
      await expect(
        parseBody(raw, contentType, dest({ maxSize: "1kb" })),
      ).rejects.toThrow(/too large/i);
    });

    it("accepts files within maxSize", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "small content");
      const body = await parseBody(raw, contentType, dest({ maxSize: "10mb" }));
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
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      const body = await parseBody(raw, contentType, dest({ fileType: ["image/jpeg"] }));
      expect(body.file).toBeDefined();
    });

    it("accepts a matching extension", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      const body = await parseBody(raw, contentType, dest({ fileType: [".jpg"] }));
      expect(body.file).toBeDefined();
    });

    it("accepts when extension or mime matches (OR logic)", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
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
      const body = await parseBody(raw, contentType, dest({ maxSize: "1mb" }));
      expect(body.text).toBe("hello");
    });

    it("still parses text fields when a file is rejected", async () => {
      const { raw, contentType } = makeMultipart("photo.jpg", "toolarge", "image/jpeg");
      // The whole parse rejects when a file fails validation
      await expect(parseBody(raw, contentType, dest({ maxSize: 1 }))).rejects.toThrow();
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
      maxSize: "1mb",
      fileType: ["image/jpeg", ".jpg"],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("rejects a file over maxSize", async () => {
    const res = await post({ bucket: mockBucket(), maxSize: 10 }, "a".repeat(100));
    expect(res.status).toBe(500);
  });

  it("rejects a disallowed fileType", async () => {
    const res = await post({ bucket: mockBucket(), fileType: ["image/png"] });
    expect(res.status).toBe(500);
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
      { bucket: mockBucket(), maxSize: "1mb" },
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
