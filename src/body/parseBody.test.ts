import parseBody from "./parseBody";
import { cleanupBuckets, count, realBucket } from "../tests/realBucket";

afterAll(cleanupBuckets);

const BOUNDARY = "----WebKitFormBoundaryvef1fLxmoUdYZWXp";
const CONTENT_TYPE = `multipart/form-data; boundary=${BOUNDARY}`;

const getBody = () => {
  let body = "trash1\r\n";
  body += `--${BOUNDARY}\r\n`;
  body += 'Content-Disposition: form-data; name="hello";\r\n\r\n';
  body += "world\r\n";
  body += `--${BOUNDARY}\r\n`;
  body +=
    'Content-Disposition: form-data; name="profile"; filename="profile.md"\r\n';
  body += "Content-Type: text/plain\r\n\r\n";
  body += "@11X";
  body += "111Y\r\n";
  body += "111Z\rCCCC\nCCCC\r\nCCCCC@\r\n\r\n";
  body += `--${BOUNDARY}\r\n`;
  body +=
    'Content-Disposition: form-data; name="gallery[]"; filename="A.txt"\r\n';
  body += "Content-Type: text/plain\r\n\r\n";
  body += "@11X";
  body += "111Y\r\n";
  body += "111Z\rCCCC\nCCCC\r\nCCCCC@\r\n\r\n";
  body += `--${BOUNDARY}\r\n`;
  body += 'Content-Disposition: form-data; name="test";\r\n\r\n';
  body += "test message 123456\r\n";
  body += `--${BOUNDARY}\r\n`;
  body += 'Content-Disposition: form-data; name="test";\r\n\r\n';
  body += "test message number two\r\n";
  body += `--${BOUNDARY}\r\n`;
  body +=
    'Content-Disposition: form-data; name="gallery[]"; filename="C.txt"\r\n';
  body += "Content-Type: text/plain\r\n\r\n";
  body += "@CCC";
  body += "CCCY\r\n";
  body += "CCCZ\rCCCW\nCCC0\r\n666@\r\n";
  body += `--${BOUNDARY}--\r\n`;
  return body;
};

const mockBucket = realBucket;

describe("parseBody", () => {
  it("can parse text fields from a multipart body", async () => {
    const body = await parseBody(
      Buffer.from(getBody(), "utf-8"),
      CONTENT_TYPE,
      mockBucket(),
    );
    expect(body).toMatchObject({
      hello: "world",
      test: ["test message 123456", "test message number two"],
    });
  });

  it("returns rich file objects for uploaded files", async () => {
    const body = await parseBody(
      Buffer.from(getBody(), "utf-8"),
      CONTENT_TYPE,
      mockBucket(),
    );

    expect(body.profile).toMatchObject({
      name: "profile.md",
      path: expect.stringMatching(/^\w{16}$/),
      type: "text/plain",
      size: expect.any(Number),
    });

    // gallery[] has two files, so it collects into an array
    expect(body.gallery).toHaveLength(2);
    expect(body.gallery[0]).toMatchObject({
      name: "A.txt",
      path: expect.stringMatching(/^\w{16}$/),
      type: "text/plain",
      size: expect.any(Number),
    });
    expect(body.gallery[1]).toMatchObject({ name: "C.txt" });
  });

  it("refuses a file part when no bucket is provided", async () => {
    expect(
      parseBody(Buffer.from(getBody(), "utf-8"), CONTENT_TYPE),
    ).rejects.toThrow(/uploads/);
  });

  it("records correct file size", async () => {
    const fileContent = "exactly this content";
    let body = `--${BOUNDARY}\r\n`;
    body += 'Content-Disposition: form-data; name="doc"; filename="doc.txt"\r\n';
    body += "Content-Type: text/plain\r\n\r\n";
    body += `${fileContent}\r\n`;
    body += `--${BOUNDARY}--\r\n`;

    const result = await parseBody(
      Buffer.from(body, "utf-8"),
      CONTENT_TYPE,
      mockBucket(),
    );

    expect(result.doc.size).toBe(Buffer.from(fileContent).length);
    expect(result.doc.name).toBe("doc.txt");
  });

  it("handles lowercase Content-Type in multipart part headers", async () => {
    let body = `--${BOUNDARY}\r\n`;
    body += 'Content-Disposition: form-data; name="photo"; filename="photo.jpg"\r\n';
    body += "content-type: image/jpeg\r\n\r\n"; // lowercase
    body += "fakejpegdata\r\n";
    body += `--${BOUNDARY}--\r\n`;

    const result = await parseBody(
      Buffer.from(body, "utf-8"),
      CONTENT_TYPE,
      mockBucket(),
    );

    expect(result.photo.type).toBe("image/jpeg");
  });

  it("preserves the original filename separate from the stored key", async () => {
    let body = `--${BOUNDARY}\r\n`;
    body += 'Content-Disposition: form-data; name="photo"; filename="my photo (1).jpeg"\r\n';
    body += "Content-Type: image/jpeg\r\n\r\n";
    body += "fakejpegdata\r\n";
    body += `--${BOUNDARY}--\r\n`;

    const result = await parseBody(
      Buffer.from(body, "utf-8"),
      CONTENT_TYPE,
      mockBucket(),
    );

    expect(result.photo.name).toBe("my photo (1).jpeg");
    expect(result.photo.path).not.toBe("my photo (1).jpeg");
    expect(result.photo.type).toBe("image/jpeg");
  });
});

// A multipart body with no usable boundary is malformed (RFC 2046 requires
// one). It must be refused rather than reinterpreted: every other branch below
// misses this content type, so the raw body would land in the bucket as a file.
describe("a multipart body with no boundary", () => {
  it("rejects instead of storing the body as a file", async () => {
    const bucket = mockBucket();
    const body = Buffer.from("SECRET-PAYLOAD", "utf-8");
    expect(parseBody(body, "multipart/form-data", bucket)).rejects.toThrow(
      /boundary/i,
    );
    expect(await count(bucket)).toBe(0);
  });

  it("rejects an empty boundary the same way", async () => {
    const bucket = mockBucket();
    expect(
      parseBody(Buffer.from("x", "utf-8"), "multipart/form-data; boundary=", bucket),
    ).rejects.toThrow(/boundary/i);
    expect(await count(bucket)).toBe(0);
  });

  it("rejects with no bucket at all, rather than handing back a Buffer", async () => {
    expect(
      parseBody(Buffer.from("SECRET-PAYLOAD", "utf-8"), "multipart/form-data"),
    ).rejects.toThrow(/boundary/i);
  });
});

// RFC 2045 says the parameter name is case-insensitive and its value may be
// quoted; RFC 2046 allows "=" inside the boundary itself.
describe("the boundary parameter, as the RFCs allow it", () => {
  const bodyFor = (boundary: string) =>
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="a"\r\n\r\nhello\r\n--${boundary}--\r\n`,
      "utf-8",
    );

  it("reads a case-insensitive parameter name", async () => {
    const body = await parseBody(
      bodyFor("abc123"),
      "Multipart/Form-Data; BOUNDARY=abc123",
      mockBucket(),
    );
    expect(body).toMatchObject({ a: "hello" });
  });

  it("reads a quoted boundary", async () => {
    const body = await parseBody(
      bodyFor("abc123"),
      'multipart/form-data; boundary="abc123"',
      mockBucket(),
    );
    expect(body).toMatchObject({ a: "hello" });
  });

  it("keeps a boundary that contains '='", async () => {
    const body = await parseBody(
      bodyFor("abc=def"),
      "multipart/form-data; boundary=abc=def",
      mockBucket(),
    );
    expect(body).toMatchObject({ a: "hello" });
  });
});

// RFC 6839: "+json" is the structured syntax suffix, so a vendor or profile
// type built on JSON (JSON:API, JSON-LD, RFC 7807 problems) is still JSON.
describe("JSON media types", () => {
  const json = (type: string) =>
    parseBody(Buffer.from('{"a":1}', "utf-8"), type, mockBucket());

  it("parses the suffixed types, not just application/json", async () => {
    for (const type of [
      "application/json",
      "application/json; charset=utf-8",
      "application/ld+json",
      "application/vnd.api+json",
      "application/problem+json",
      "application/merge-patch+json",
      "application/json-patch+json",
      "application/vnd.github+json",
    ]) {
      expect(await json(type), type).toEqual({ a: 1 });
    }
  });

  it("does not match a type that merely contains the word", async () => {
    // Not JSON: it lands in the raw-body branch and becomes a file
    const body = await json("application/jsonx");
    expect(body).toMatchObject({ type: "application/jsonx" });
  });
});
