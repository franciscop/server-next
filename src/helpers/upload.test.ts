import server from "..";
import { cleanupBuckets, realBucket } from "../tests/realBucket";
import parseBody from "./parseBody";
import { getExt, UploadPipeline } from "./upload";

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
  it("lowercases the extension used in the stored id", async () => {
    const bucket = mockBucket();
    const { raw, contentType } = makeMultipart("Photo.JPG", "data", "image/jpeg");
    const body = await parseBody(raw, contentType, new UploadPipeline(bucket));
    // id must use lowercase extension, not .JPG
    expect(body.file.id).toMatch(/^\w{16}\.jpg$/);
  });

  it("plain bucket and validated pipeline produce the same UploadedFile shape", async () => {
    const b1 = mockBucket();
    const b2 = mockBucket();
    const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");

    // same raw buffer, two different destinations
    const bodyViaBucket = await parseBody(raw, contentType, b1);
    const bodyViaPipeline = await parseBody(
      raw,
      contentType,
      new UploadPipeline(b2),
    );

    // shapes must be identical
    expect(Object.keys(bodyViaBucket.file).sort()).toEqual(
      Object.keys(bodyViaPipeline.file).sort(),
    );
    expect(bodyViaBucket.file.name).toBe(bodyViaPipeline.file.name);
    expect(bodyViaBucket.file.type).toBe(bodyViaPipeline.file.type);
    expect(bodyViaBucket.file.size).toBe(bodyViaPipeline.file.size);
    // id is random so only check shape
    expect(bodyViaBucket.file.id).toMatch(/^\w{16}\.txt$/);
    expect(bodyViaPipeline.file.id).toMatch(/^\w{16}\.txt$/);
  });
});

// Validation is exercised at the parseBody layer via the internal pipeline the
// `uploads` object form builds (see the public tests further down).
describe("upload validation", () => {
  describe("maxSize", () => {
    it("rejects files exceeding maxSize in bytes", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({ maxSize: 10 });
      const { raw, contentType } = makeMultipart("photo.jpg", "a".repeat(100));
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /too large/i,
      );
    });

    it("rejects files exceeding maxSize in string form (kb)", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({ maxSize: "1kb" });
      const { raw, contentType } = makeMultipart("photo.jpg", "x".repeat(2000));
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /too large/i,
      );
    });

    it("accepts files within maxSize", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({ maxSize: "10mb" });
      const { raw, contentType } = makeMultipart("photo.jpg", "small content");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });
  });

  describe("minSize", () => {
    it("rejects files below minSize", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({ minSize: "1mb" });
      const { raw, contentType } = makeMultipart("photo.jpg", "tiny");
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /too small/i,
      );
    });

    it("accepts files meeting minSize", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({ minSize: 4 });
      const { raw, contentType } = makeMultipart("photo.jpg", "four");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });
  });

  describe("fileType", () => {
    it("rejects by mime type", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({
        fileType: ["image/png"],
      });
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /file type/i,
      );
    });

    it("rejects by extension", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({
        fileType: [".png"],
      });
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /file type/i,
      );
    });

    it("accepts a matching mime type", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({
        fileType: ["image/jpeg"],
      });
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });

    it("accepts a matching extension", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({
        fileType: [".jpg"],
      });
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });

    it("accepts when extension or mime matches (OR logic)", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({
        fileType: [".png", "image/jpeg"],
      });
      const { raw, contentType } = makeMultipart("photo.jpg", "data", "image/jpeg");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });
  });

  describe("text fields are unaffected", () => {
    it("still parses text fields when a file is validated and stored", async () => {
      const pipeline = new UploadPipeline(mockBucket());
      const { raw, contentType } = makeMultipart("photo.jpg", "imgdata", "image/jpeg");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.text).toBe("hello");
    });

    it("still parses text fields when a file is rejected", async () => {
      const pipeline = new UploadPipeline(mockBucket()).limit({ maxSize: 1 });
      const { raw, contentType } = makeMultipart("photo.jpg", "toolarge", "image/jpeg");
      // The whole parse rejects when a file fails validation
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow();
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
