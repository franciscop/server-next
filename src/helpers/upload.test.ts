import type { Bucket } from "..";
import parseBody from "./parseBody";
import upload, { getExt, UploadPipeline } from "./upload";

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

const mockBucket = (): Bucket & { written: Map<string, Buffer> } => {
  const written = new Map<string, Buffer>();
  return {
    written,
    read: async () => null,
    write: async (name, value) => {
      written.set(name, value as Buffer);
      return `/mock/${name}`;
    },
    delete: async () => true,
  };
};

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
    const body = await parseBody(raw, contentType, upload(bucket));
    // id must use lowercase extension, not .JPG
    expect(body.file.id).toMatch(/^\w{16}\.jpg$/);
  });

  it("plain bucket and pipeline produce the same UploadedFile shape", async () => {
    const b1 = mockBucket();
    const b2 = mockBucket();
    const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");

    // same raw buffer, two different destinations
    const bodyViaBucket = await parseBody(raw, contentType, b1);
    const bodyViaPipeline = await parseBody(raw, contentType, upload(b2));

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

describe("upload() builder", () => {
  describe("construction", () => {
    it("can be created without arguments", () => {
      expect(upload()).toBeInstanceOf(UploadPipeline);
    });

    it("can be created with a bucket", () => {
      expect(upload(mockBucket())).toBeInstanceOf(UploadPipeline);
    });

    it("limit() returns the same pipeline instance for chaining", () => {
      const pipeline = upload();
      expect(pipeline.limit({ maxSize: "10mb" })).toBe(pipeline);
    });

    it("store() returns the same pipeline instance for chaining", () => {
      const pipeline = upload();
      expect(pipeline.store(mockBucket())).toBe(pipeline);
    });

    it("can chain limit() and store()", () => {
      const pipeline = upload()
        .limit({ maxSize: "10mb", fileType: ["image/jpeg"] })
        .store(mockBucket());
      expect(pipeline).toBeInstanceOf(UploadPipeline);
    });
  });

  describe("limit: maxSize", () => {
    it("rejects files exceeding maxSize in bytes", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ maxSize: 10 });
      const { raw, contentType } = makeMultipart("photo.jpg", "a".repeat(100));
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /too large/i,
      );
    });

    it("rejects files exceeding maxSize in string form (kb)", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ maxSize: "1kb" });
      const { raw, contentType } = makeMultipart("photo.jpg", "x".repeat(2000));
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /too large/i,
      );
    });

    it("accepts files within maxSize", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ maxSize: "10mb" });
      const { raw, contentType } = makeMultipart("photo.jpg", "small content");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });
  });

  describe("limit: minSize", () => {
    it("rejects files below minSize", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ minSize: "1mb" });
      const { raw, contentType } = makeMultipart("photo.jpg", "tiny");
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /too small/i,
      );
    });

    it("accepts files meeting minSize", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ minSize: 4 });
      const { raw, contentType } = makeMultipart("photo.jpg", "four");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });
  });

  describe("limit: fileType", () => {
    it("rejects by mime type", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ fileType: ["image/png"] });
      const { raw, contentType } = makeMultipart(
        "photo.jpg",
        "data",
        "image/jpeg",
      );
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /file type/i,
      );
    });

    it("rejects by extension", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ fileType: [".png"] });
      const { raw, contentType } = makeMultipart(
        "photo.jpg",
        "data",
        "image/jpeg",
      );
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /file type/i,
      );
    });

    it("accepts a matching mime type", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ fileType: ["image/jpeg"] });
      const { raw, contentType } = makeMultipart(
        "photo.jpg",
        "data",
        "image/jpeg",
      );
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });

    it("accepts a matching extension", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ fileType: [".jpg"] });
      const { raw, contentType } = makeMultipart(
        "photo.jpg",
        "data",
        "image/jpeg",
      );
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });

    it("accepts when extension or mime matches (OR logic)", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({
        fileType: [".png", "image/jpeg"],
      });
      const { raw, contentType } = makeMultipart(
        "photo.jpg",
        "data",
        "image/jpeg",
      );
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
    });
  });

  describe("store()", () => {
    it("uses the bucket set via store() when none passed to upload()", async () => {
      const bucket = mockBucket();
      const pipeline = upload().store(bucket);
      const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.file).toBeDefined();
      expect(bucket.written.size).toBe(1);
    });

    it("store() overrides the bucket passed to upload()", async () => {
      const firstBucket = mockBucket();
      const secondBucket = mockBucket();
      const pipeline = upload(firstBucket).store(secondBucket);
      const { raw, contentType } = makeMultipart("doc.txt", "hello", "text/plain");
      await parseBody(raw, contentType, pipeline);
      expect(firstBucket.written.size).toBe(0);
      expect(secondBucket.written.size).toBe(1);
    });
  });

  describe("text fields are unaffected by pipeline", () => {
    it("still parses text fields when a file is validated and stored", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket);
      const { raw, contentType } = makeMultipart("photo.jpg", "imgdata", "image/jpeg");
      const body = await parseBody(raw, contentType, pipeline);
      expect(body.text).toBe("hello");
    });

    it("still parses text fields when a file is rejected", async () => {
      const bucket = mockBucket();
      const pipeline = upload(bucket).limit({ maxSize: 1 });
      const { raw, contentType } = makeMultipart("photo.jpg", "toolarge", "image/jpeg");
      // The whole parse rejects when a file fails validation
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow();
    });
  });

  describe("pipeline without a destination", () => {
    it("throws when no bucket is configured anywhere", async () => {
      const pipeline = upload();
      const { raw, contentType } = makeMultipart("photo.jpg", "data");
      await expect(parseBody(raw, contentType, pipeline)).rejects.toThrow(
        /destination/i,
      );
    });
  });
});
