import fsp from "node:fs/promises";
import server from ".";
import parseBody from "./helpers/parseBody";
import type { Bucket, SerializableValue } from "./types";

// A bucket that actually consumes the stream and records the bytes, so tests can
// assert both the file reference shape AND that the content streamed correctly.
function capturingBucket() {
  const files = new Map<string, Buffer>();
  const make = (prefix = ""): Bucket & { files: Map<string, Buffer> } => ({
    files,
    location: prefix,
    read: async () => null,
    write: async (name, value) => {
      const key = prefix ? `${prefix}/${name}` : name;
      const buf =
        value instanceof ReadableStream
          ? Buffer.from(await new Response(value as BodyInit).arrayBuffer())
          : Buffer.from(value as Buffer);
      files.set(key, buf);
      return `/cap/${key}`;
    },
    delete: async () => true,
    folder: (p: string) => make(prefix ? `${prefix}/${p}` : p),
  });
  return make();
}

// Enqueue `data` in chunks of `size` bytes, so the parser sees boundaries split
// across chunk borders (size = 1 is the meanest case).
function streamOf(data: Buffer | string, size = Number.POSITIVE_INFINITY) {
  const buf = Buffer.from(data);
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < buf.length; i += size) {
        c.enqueue(buf.subarray(i, Math.min(i + size, buf.length)));
      }
      c.close();
    },
  });
}

const BOUNDARY = "----boundaryXYZ";
const MULTIPART = `multipart/form-data; boundary=${BOUNDARY}`;

// Builds a raw multipart body from parts (text fields or files)
function multipart(
  parts: Array<{
    name: string;
    value?: string;
    filename?: string;
    type?: string;
    content?: string;
  }>,
) {
  let s = "";
  for (const p of parts) {
    s += `--${BOUNDARY}\r\n`;
    if (p.filename !== undefined) {
      s += `Content-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\n`;
      s += `Content-Type: ${p.type ?? "application/octet-stream"}\r\n\r\n`;
      s += `${p.content ?? ""}\r\n`;
    } else {
      s += `Content-Disposition: form-data; name="${p.name}"\r\n\r\n`;
      s += `${p.value ?? ""}\r\n`;
    }
  }
  s += `--${BOUNDARY}--\r\n`;
  return Buffer.from(s, "utf-8");
}

const json = { "content-type": "application/json" };
const echo = server()
  .post("/", (ctx) => ({ body: ctx.body as SerializableValue }))
  .test();

// Real on-disk uploads dir for integration tests that read the file content
// back (the in-memory capturing bucket is used by the direct-parseBody unit
// tests below; through the full server it races bun's stream timing).
const TMP = "./src/tests/uploads/_ctxbody";
afterAll(async () => {
  await fsp.rm(TMP, { recursive: true, force: true });
});

// --------------------------------------------------------------------------
// parse mode, by content-type (integration: real request -> ctx.body)
// --------------------------------------------------------------------------

describe("ctx.body parse: JSON", () => {
  const cases: Array<[string, unknown]> = [
    ["an object", { name: "Francisco", age: 30 }],
    ["an array", [1, 2, 3]],
    ["a nested structure", { a: { b: [{ c: true }] }, list: ["x", "y"] }],
    ["a number", 42],
    ["a string", "hello"],
    ["a boolean", false],
    ["null", null],
  ];
  for (const [label, value] of cases) {
    it(`parses ${label}`, async () => {
      const res = await echo.post("/", JSON.stringify(value), { headers: json });
      expect((await res.json()).body).toEqual(value);
    });
  }
});

describe("ctx.body parse: text", () => {
  it("returns a string for text/plain", async () => {
    const res = await echo.post("/", "just text", {
      headers: { "content-type": "text/plain" },
    });
    expect((await res.json()).body).toBe("just text");
  });

  it("returns a string when there is no content-type", async () => {
    const res = await echo.post("/", "no type here");
    expect((await res.json()).body).toBe("no type here");
  });
});

describe("ctx.body parse: url-encoded", () => {
  const form = { "content-type": "application/x-www-form-urlencoded" };

  it("parses a single field", async () => {
    const res = await echo.post("/", "name=alice", { headers: form });
    expect((await res.json()).body).toEqual({ name: "alice" });
  });

  it("parses multiple fields", async () => {
    const res = await echo.post("/", "a=1&b=2&c=3", { headers: form });
    expect((await res.json()).body).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("arrays a repeated key", async () => {
    const res = await echo.post("/", "tag=x&tag=y&tag=z", { headers: form });
    expect((await res.json()).body).toEqual({ tag: ["x", "y", "z"] });
  });

  it("decodes percent-encoding and plus", async () => {
    const res = await echo.post("/", "q=a%20b+c&e=a%40b.com", { headers: form });
    expect((await res.json()).body).toEqual({ q: "a b c", e: "a@b.com" });
  });
});

describe("ctx.body parse: multipart fields", () => {
  it("parses text fields into an object", async () => {
    const body = multipart([
      { name: "first", value: "Francisco" },
      { name: "last", value: "Presencia" },
    ]);
    const res = await echo.post("/", body, { headers: { "content-type": MULTIPART } });
    expect((await res.json()).body).toEqual({
      first: "Francisco",
      last: "Presencia",
    });
  });

  it("arrays a repeated text field", async () => {
    const body = multipart([
      { name: "tag", value: "a" },
      { name: "tag", value: "b" },
    ]);
    const res = await echo.post("/", body, { headers: { "content-type": MULTIPART } });
    expect((await res.json()).body).toEqual({ tag: ["a", "b"] });
  });

  it("strips a trailing [] from the field name", async () => {
    const body = multipart([
      { name: "ids[]", value: "1" },
      { name: "ids[]", value: "2" },
    ]);
    const res = await echo.post("/", body, { headers: { "content-type": MULTIPART } });
    expect((await res.json()).body).toEqual({ ids: ["1", "2"] });
  });
});

describe("ctx.body parse: multipart files", () => {
  const api = server({ uploads: TMP })
    .post("/", (ctx) => ctx.body)
    .test();

  it("stores a file and mixes it with fields", async () => {
    const body = multipart([
      { name: "title", value: "my pic" },
      { name: "avatar", filename: "a.png", type: "image/png", content: "PNGDATA" },
    ]);
    const res = await api.post("/", body, { headers: { "content-type": MULTIPART } });
    const out = await res.json();

    expect(out.title).toBe("my pic");
    expect(out.avatar).toMatchObject({
      name: "a.png",
      id: expect.stringMatching(/^\w{16}\.png$/),
      type: "image/png",
      size: 7,
    });
    // the bytes actually streamed to disk
    expect(await fsp.readFile(out.avatar.path, "utf8")).toBe("PNGDATA");
  });

  it("stores multiple distinct files", async () => {
    const body = multipart([
      { name: "doc", filename: "a.txt", type: "text/plain", content: "alpha" },
      { name: "img", filename: "b.png", type: "image/png", content: "betabeta" },
    ]);
    const res = await api.post("/", body, { headers: { "content-type": MULTIPART } });
    const out = await res.json();

    expect(await fsp.readFile(out.doc.path, "utf8")).toBe("alpha");
    expect(await fsp.readFile(out.img.path, "utf8")).toBe("betabeta");
    expect(out.doc.size).toBe(5);
    expect(out.img.size).toBe(8);
  });

  it("collects a repeated file field into an array", async () => {
    const body = multipart([
      { name: "photos", filename: "a.txt", type: "text/plain", content: "one" },
      { name: "photos", filename: "b.txt", type: "text/plain", content: "two" },
    ]);
    const res = await api.post("/", body, { headers: { "content-type": MULTIPART } });
    const out = await res.json();

    expect(out.photos).toHaveLength(2);
    expect(out.photos[0].name).toBe("a.txt");
    expect(out.photos[1].name).toBe("b.txt");
    expect(await fsp.readFile(out.photos[0].path, "utf8")).toBe("one");
    expect(await fsp.readFile(out.photos[1].path, "utf8")).toBe("two");
  });

  it("skips file parts when no bucket is configured, keeping fields", async () => {
    const body = multipart([
      { name: "name", value: "alice" },
      { name: "file", filename: "x.bin", content: "ignored" },
    ]);
    const res = await echo.post("/", body, { headers: { "content-type": MULTIPART } });
    const out = (await res.json()).body;
    expect(out.name).toBe("alice");
    expect(out.file).toBeUndefined();
  });
});

// --------------------------------------------------------------------------
// parse mode, Case B: a single raw file as the whole body
// --------------------------------------------------------------------------

describe("ctx.body parse: raw single file (Case B)", () => {
  it("streams the body to the bucket as one file with a sensible extension", async () => {
    const api = server({ uploads: TMP })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", Buffer.from("a movie"), {
      headers: { "content-type": "video/mp4" },
    });
    const out = await res.json();

    expect(out).toMatchObject({
      id: expect.stringMatching(/^\w{16}\.mp4$/),
      type: "video/mp4",
      size: 7,
    });
    expect(await fsp.readFile(out.path, "utf8")).toBe("a movie");
  });

  it("uses .bin when the content-type has no clean subtype", async () => {
    const bucket = capturingBucket();
    const api = server({ uploads: bucket })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", Buffer.from([1, 2, 3, 4]), {
      headers: { "content-type": "application/octet-stream" },
    });
    expect((await res.json()).id).toMatch(/^\w{16}\.bin$/);
  });

  it("returns the Buffer when no bucket is configured", async () => {
    const api = server()
      .post("/", (ctx) => ({
        isBuffer: Buffer.isBuffer(ctx.body),
        text: (ctx.body as Buffer).toString(),
      }))
      .test();
    const res = await api.post("/", Buffer.from("raw bytes"), {
      headers: { "content-type": "application/octet-stream" },
    });
    expect(await res.json()).toEqual({ isBuffer: true, text: "raw bytes" });
  });
});

// --------------------------------------------------------------------------
// raw / stream modes
// --------------------------------------------------------------------------

describe("ctx.body raw mode", () => {
  it("never parses, even valid JSON", async () => {
    const api = server({ body: "raw" })
      .post("/", (ctx) => ({
        isBuffer: Buffer.isBuffer(ctx.body),
        text: (ctx.body as Buffer).toString(),
      }))
      .test();
    const res = await api.post("/", JSON.stringify({ a: 1 }), { headers: json });
    expect(await res.json()).toEqual({ isBuffer: true, text: '{"a":1}' });
  });
});

describe("ctx.body stream mode", () => {
  it("is a ReadableStream that yields the exact bytes", async () => {
    const api = server()
      .post("/", { body: "stream" }, async (ctx) => {
        const buf = Buffer.from(await new Response(ctx.body as ReadableStream).arrayBuffer());
        return { isStream: ctx.body instanceof ReadableStream, hex: buf.toString("hex") };
      })
      .test();
    const res = await api.post("/", Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    expect(await res.json()).toEqual({ isStream: true, hex: "deadbeef" });
  });
});

// --------------------------------------------------------------------------
// empty bodies
// --------------------------------------------------------------------------

describe("ctx.body empty", () => {
  const probe = server()
    .get("/", (ctx) => ({ defined: ctx.body !== undefined }))
    .post("/", (ctx) => ({ defined: ctx.body !== undefined }))
    .test();

  it("is undefined for a GET", async () => {
    expect((await (await probe.get("/")).json()).defined).toBe(false);
  });

  it("is undefined for a POST with no body", async () => {
    expect((await (await probe.post("/")).json()).defined).toBe(false);
  });
});

// --------------------------------------------------------------------------
// streaming parser robustness: chunk splitting must not change the result
// --------------------------------------------------------------------------

describe("streaming parser: chunk splitting", () => {
  const body = multipart([
    { name: "field", value: "a value with spaces" },
    { name: "dup", value: "one" },
    { name: "dup", value: "two" },
    {
      name: "file",
      filename: "data.bin",
      type: "application/octet-stream",
      // content that contains \r\n and partial boundary-looking bytes
      content: "line1\r\nline2\r\n--not-the-boundary\r\nend",
    },
  ]);

  for (const size of [Number.POSITIVE_INFINITY, 64, 7, 3, 1]) {
    it(`parses identically with ${size}-byte chunks`, async () => {
      const bucket = capturingBucket();
      const out = await parseBody(streamOf(body, size), MULTIPART, bucket);
      expect(out.field).toBe("a value with spaces");
      expect(out.dup).toEqual(["one", "two"]);
      expect(out.file).toMatchObject({
        name: "data.bin",
        type: "application/octet-stream",
      });
      // the file content survived chunking exactly
      expect(bucket.files.get(out.file.id)?.toString()).toBe(
        "line1\r\nline2\r\n--not-the-boundary\r\nend",
      );
      expect(out.file.size).toBe(
        Buffer.byteLength("line1\r\nline2\r\n--not-the-boundary\r\nend"),
      );
    });
  }

  it("streams a larger file split across many chunks intact", async () => {
    const big = `${"X".repeat(50_000)}\r\n--almost--${"Y".repeat(50_000)}`;
    const body = multipart([
      { name: "blob", filename: "big.bin", content: big },
    ]);
    const bucket = capturingBucket();
    const out = await parseBody(streamOf(body, 997), MULTIPART, bucket);
    expect(bucket.files.get(out.blob.id)?.toString()).toBe(big);
    expect(out.blob.size).toBe(Buffer.byteLength(big));
  });

  it("Case B: a raw file streamed in tiny chunks keeps its bytes and size", async () => {
    const bytes = Buffer.from(
      Array.from({ length: 1000 }, (_, i) => i % 256),
    );
    const bucket = capturingBucket();
    const out = await parseBody(streamOf(bytes, 5), "image/png", bucket);
    expect(out.size).toBe(1000);
    expect(bucket.files.get(out.id)?.equals(bytes)).toBe(true);
  });
});

describe("streaming parser: buffer and stream inputs agree", () => {
  it("a Buffer and a 1-byte stream produce the same fields", async () => {
    const body = multipart([
      { name: "a", value: "1" },
      { name: "f", filename: "f.txt", type: "text/plain", content: "hello world" },
    ]);
    const viaBuffer = await parseBody(body, MULTIPART, capturingBucket());
    const viaStream = await parseBody(streamOf(body, 1), MULTIPART, capturingBucket());

    expect(viaBuffer.a).toBe(viaStream.a);
    expect(viaBuffer.f.name).toBe(viaStream.f.name);
    expect(viaBuffer.f.size).toBe(viaStream.f.size);
    expect(viaBuffer.f.type).toBe(viaStream.f.type);
  });
});
