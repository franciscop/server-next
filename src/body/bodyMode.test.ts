import { once } from "node:events";
import fsp from "node:fs/promises";
import server, { status } from "../index";
import { Node } from "../context/handlers";
import { cleanupBuckets, realBucket } from "../tests/realBucket";

afterAll(cleanupBuckets);

const json = { "content-type": "application/json" };

describe("body mode resolution", () => {
  it("defaults to parse", async () => {
    const api = server()
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", JSON.stringify({ a: 1 }), {
      headers: json,
    });
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("per-route body overrides the global default", async () => {
    const api = server({ parser: "raw" })
      .post("/raw", (ctx) => ({ isBuffer: Buffer.isBuffer(ctx.body) }))
      .post("/parsed", { parser: "auto" }, (ctx) => ctx.body)
      .test();

    const raw = await api.post("/raw", JSON.stringify({ a: 1 }), {
      headers: json,
    });
    expect(await raw.json()).toEqual({ isBuffer: true });

    const parsed = await api.post("/parsed", JSON.stringify({ a: 1 }), {
      headers: json,
    });
    expect(await parsed.json()).toEqual({ a: 1 });
  });
});

describe("body: raw", () => {
  it("gives the handler the unparsed Buffer", async () => {
    const api = server({ parser: "raw" })
      .post("/", (ctx) => ({
        isBuffer: Buffer.isBuffer(ctx.body),
        text: (ctx.body as Buffer).toString(),
      }))
      .test();
    const res = await api.post("/", JSON.stringify({ a: 1 }), {
      headers: json,
    });
    // raw ignores content-type: the JSON is NOT parsed, just the bytes
    expect(await res.json()).toEqual({ isBuffer: true, text: '{"a":1}' });
  });
});

describe("body: stream", () => {
  it("hands the handler a web ReadableStream", async () => {
    const api = server()
      .post("/echo", { parser: "stream" }, async (ctx) => {
        const isStream = ctx.body instanceof ReadableStream;
        const text = await new Response(ctx.body as ReadableStream).text();
        return { isStream, text };
      })
      .test();

    const res = await api.post("/echo", "streamed-bytes");
    expect(await res.json()).toEqual({
      isStream: true,
      text: "streamed-bytes",
    });
  });

  it("streams the body straight into a bucket folder", async () => {
    const api = server({ uploads: "./src/tests/uploads" })
      .post("/uploads/:id", { parser: "stream" }, async (ctx) => {
        const uploads = (ctx.options.uploads as any).bucket;
        const file = uploads.folder!(ctx.url.params.id).file("movie.txt");
        await file.write(ctx.body as ReadableStream);
        return { path: file.path };
      })
      .test();

    const res = await api.post("/uploads/abc123", "pretend-this-is-a-big-file");
    const { path } = await res.json();
    // `path` is the key within the bucket, so it reads under the uploads root
    expect(path).toBe("abc123/movie.txt");
    expect(await fsp.readFile(`./src/tests/uploads/${path}`, "utf8")).toBe(
      "pretend-this-is-a-big-file",
    );

    await fsp.rm("./src/tests/uploads/abc123", {
      recursive: true,
      force: true,
    });
  });

  it("streams into a real bucket's folder() (bucket lib)", async () => {
    const uploads = realBucket();
    const api = server({ uploads })
      .post("/uploads/:id", { parser: "stream" }, async (ctx) => {
        const up = (ctx.options.uploads as any).bucket;
        const file = up.folder!(ctx.url.params.id).file("movie.txt");
        await file.write(ctx.body as ReadableStream);
        return { path: file.path };
      })
      .test();

    const res = await api.post("/uploads/abc123", "into-a-real-bucket");
    const { path } = await res.json();
    // The real bucket reports the same key shape, and reads back through it
    expect(path).toBe("abc123/movie.txt");
    expect(await uploads.file(path).text()).toBe("into-a-real-bucket");
  });

  it("runs middleware (a guard) before the body is consumed", async () => {
    let handlerRan = false;
    const api = server()
      .post(
        "/guarded",
        { parser: "stream" },
        (ctx) => {
          if (!ctx.headers["x-key"]) return status(401).send("no key");
        },
        async (ctx) => {
          handlerRan = true;
          await new Response(ctx.body as ReadableStream).text();
          return "ok";
        },
      )
      .test();

    const denied = await api.post("/guarded", "body");
    expect(denied.status).toBe(401);
    expect(handlerRan).toBe(false);

    const ok = await api.post("/guarded", "body", {
      headers: { "x-key": "yes" },
    });
    expect(ok.status).toBe(200);
    expect(handlerRan).toBe(true);
  });
});

// The web runtimes go through .test() above (the Fetchable handler). The Node
// adapter builds its body differently, so a real Node server proves ctx.body
// comes out the same in every mode.
describe("Node adapter parity", () => {
  const port = 8796;
  let http: any;

  beforeAll(async () => {
    const app = server({ port, log: false })
      .post("/parse", (ctx) => ctx.body)
      .post("/raw", { parser: "raw" }, (ctx) => ({
        isBuffer: Buffer.isBuffer(ctx.body),
        text: String(ctx.body),
      }))
      .post("/stream", { parser: "stream" }, async (ctx) => ({
        isStream: ctx.body instanceof ReadableStream,
        text: await new Response(ctx.body as ReadableStream).text(),
      }));
    http = await Node(app);
    if (!http.listening) await once(http, "listening");
  });

  afterAll(() => http?.close());

  const post = async (path: string, body: string, type: string) => {
    const res = await fetch(`http://localhost:${port}${path}`, {
      method: "POST",
      body,
      headers: { "content-type": type },
    });
    return res.json();
  };

  it("parse → parsed object, like the web runtime", async () => {
    const out = await post(
      "/parse",
      JSON.stringify({ a: 1 }),
      "application/json",
    );
    expect(out).toEqual({ a: 1 });
  });

  it("raw → Buffer", async () => {
    const out = await post("/raw", "hello", "text/plain");
    expect(out).toEqual({ isBuffer: true, text: "hello" });
  });

  it("stream → web ReadableStream", async () => {
    const out = await post("/stream", "hi", "text/plain");
    expect(out).toEqual({ isStream: true, text: "hi" });
  });
});
