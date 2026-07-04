import parseBody from "./parseBody";
import { cleanupBuckets, realBucket } from "../tests/realBucket";

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
      id: expect.stringMatching(/^\w{16}\.md$/),
      path: expect.stringMatching(/\/\w{16}\.md$/),
      type: "text/plain",
      size: expect.any(Number),
    });

    // gallery[] has two files, so it collects into an array
    expect(body.gallery).toHaveLength(2);
    expect(body.gallery[0]).toMatchObject({
      name: "A.txt",
      id: expect.stringMatching(/^\w{16}\.txt$/),
      path: expect.stringMatching(/\/\w{16}\.txt$/),
      type: "text/plain",
      size: expect.any(Number),
    });
    expect(body.gallery[1]).toMatchObject({ name: "C.txt" });
  });

  it("skips file parts when no bucket is provided", async () => {
    const body = await parseBody(
      Buffer.from(getBody(), "utf-8"),
      CONTENT_TYPE,
      // no bucket
    );

    expect(body.hello).toBe("world");
    expect(body.test).toEqual(["test message 123456", "test message number two"]);
    expect(body.profile).toBeUndefined();
    expect(body.gallery).toBeUndefined();
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

  it("preserves original filename separate from generated id", async () => {
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
    expect(result.photo.id).not.toBe("my photo (1).jpeg");
    expect(result.photo.type).toBe("image/jpeg");
  });
});
