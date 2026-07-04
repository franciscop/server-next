import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import server, { status } from ".";
import createNode from "./context/node";
import { resolveBody } from "./helpers";
import { cleanupBuckets, realBucket } from "./tests/realBucket";
import type { Bucket } from "./types";

afterAll(cleanupBuckets);

const json = { "content-type": "application/json" };

describe("body mode resolution", () => {
  it("defaults to parse", async () => {
    const api = server()
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", JSON.stringify({ a: 1 }), { headers: json });
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("per-route body overrides the global default", async () => {
    const api = server({ body: "raw" })
      .post("/raw", (ctx) => ({ isBuffer: Buffer.isBuffer(ctx.body) }))
      .post("/parsed", { body: "parse" }, (ctx) => ctx.body)
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
    const api = server({ body: "raw" })
      .post("/", (ctx) => ({
        isBuffer: Buffer.isBuffer(ctx.body),
        text: (ctx.body as Buffer).toString(),
      }))
      .test();
    const res = await api.post("/", JSON.stringify({ a: 1 }), { headers: json });
    // raw ignores content-type: the JSON is NOT parsed, just the bytes
    expect(await res.json()).toEqual({ isBuffer: true, text: '{"a":1}' });
  });
});

describe("body: stream", () => {
  it("hands the handler a web ReadableStream", async () => {
    const api = server()
      .post("/echo", { body: "stream" }, async (ctx) => {
        const isStream = ctx.body instanceof ReadableStream;
        const text = await new Response(ctx.body as ReadableStream).text();
        return { isStream, text };
      })
      .test();

    const res = await api.post("/echo", "streamed-bytes");
    expect(await res.json()).toEqual({ isStream: true, text: "streamed-bytes" });
  });

  it("streams the body straight into a bucket folder", async () => {
    const api = server({ uploads: "./src/tests/uploads" })
      .post("/uploads/:id", { body: "stream" }, async (ctx) => {
        const uploads = ctx.options.uploads as Bucket;
        const file = uploads.folder!(ctx.url.params.id).file("movie.txt");
        await file.write(ctx.body as ReadableStream);
        return { path: file.path };
      })
      .test();

    const res = await api.post("/uploads/abc123", "pretend-this-is-a-big-file");
    const { path } = await res.json();
    expect(path).toMatch(/uploads\/abc123\/movie\.txt$/);
    expect(await fsp.readFile(path, "utf8")).toBe("pretend-this-is-a-big-file");

    await fsp.rm("./src/tests/uploads/abc123", { recursive: true, force: true });
  });

  it("streams into a real bucket's folder() (bucket lib)", async () => {
    const uploads = realBucket();
    const api = server({ uploads })
      .post("/uploads/:id", { body: "stream" }, async (ctx) => {
        const up = ctx.options.uploads as Bucket;
        const file = up.folder!(ctx.url.params.id).file("movie.txt");
        await file.write(ctx.body as ReadableStream);
        return { path: file.path };
      })
      .test();

    const res = await api.post("/uploads/abc123", "into-a-real-bucket");
    const { path } = await res.json();
    expect(path).toMatch(/abc123\/movie\.txt$/);
    expect(await fsp.readFile(path, "utf8")).toBe("into-a-real-bucket");
  });

  it("runs middleware (a guard) before the body is consumed", async () => {
    let handlerRan = false;
    const api = server()
      .post(
        "/guarded",
        { body: "stream" },
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

// The web runtimes go through .test() above (createWinter). Drive the Node
// builder directly with a mock IncomingMessage to prove ctx.body matches.
describe("Node builder parity", () => {
  const app = server();

  const mockReq = (body: string, contentType = "application/json") => {
    const req = Readable.from([Buffer.from(body)]) as any;
    req.method = "POST";
    req.url = "/";
    req.rawHeaders = ["content-type", contentType, "host", "localhost"];
    req.socket = { remoteAddress: "127.0.0.1" };
    return req;
  };

  it("parse → parsed object, like the web runtime", async () => {
    const ctx = await createNode(mockReq(JSON.stringify({ a: 1 })), app as any);
    expect(await resolveBody(ctx, "parse")).toEqual({ a: 1 });
  });

  it("raw → Buffer", async () => {
    const ctx = await createNode(mockReq("hello", "text/plain"), app as any);
    const out = await resolveBody(ctx, "raw");
    expect(Buffer.isBuffer(out)).toBe(true);
    expect((out as Buffer).toString()).toBe("hello");
  });

  it("stream → web ReadableStream", async () => {
    const ctx = await createNode(mockReq("hi", "text/plain"), app as any);
    const out = await resolveBody(ctx, "stream");
    expect(out).toBeInstanceOf(ReadableStream);
    expect(await new Response(out as ReadableStream).text()).toBe("hi");
  });
});
