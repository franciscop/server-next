import { rm } from "node:fs/promises";
import server, { file, type } from ".";
import localBucket from "./helpers/bucket";
import createId from "./helpers/createId";

// Fresh built-in local buckets in a throwaway temp dir.
const ROOT = new URL("./tests/uploads/_serve/", import.meta.url).pathname;
afterAll(() => rm(ROOT, { recursive: true, force: true }));

// Store one file in a fresh local bucket and return the bucket. The local
// bucket derives each file's `.type` from its name, so the name's extension is
// what determines the served Content-Type.
async function seed(name: string, data: string) {
  const bucket = localBucket(`${ROOT}${createId()}`)!;
  await bucket.file(name).write(Buffer.from(data));
  return bucket;
}

describe("serving bucket files", () => {
  it("returns a bucket file handle directly (streamed, typed)", async () => {
    const bucket = await seed("avatar.jpg", "IMG");
    const res = await server()
      .get("/avatar", () => bucket.file("avatar.jpg"))
      .test()
      .get("/avatar");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/jpeg");
    expect(await res.text()).toBe("IMG");
  });

  it("404s when the file doesn't exist", async () => {
    const bucket = localBucket(`${ROOT}${createId()}`)!;
    const res = await server()
      .get("/avatar", () => bucket.file("missing.jpg"))
      .test()
      .get("/avatar");
    expect(res.status).toBe(404);
  });

  it("file() helper accepts a bucket file handle", async () => {
    const bucket = await seed("doc.png", "PNG");
    const res = await server()
      .get("/x", () => file(bucket.file("doc.png")))
      .test()
      .get("/x");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(await res.text()).toBe("PNG");
  });

  it("file() helper 404s for a missing bucket file", async () => {
    const bucket = localBucket(`${ROOT}${createId()}`)!;
    const res = await server()
      .get("/x", () => file(bucket.file("nope.png")))
      .test()
      .get("/x");
    expect(res.status).toBe(404);
  });

  it("serves raw bytes with an explicit type", async () => {
    const bucket = await seed("pic.jpg", "BYTES");
    const res = await server()
      .get("/b", async () =>
        type("jpg").send(await bucket.file("pic.jpg").bytes()),
      )
      .test()
      .get("/b");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/jpeg");
    expect(await res.text()).toBe("BYTES");
  });

  it("uses the handle's type verbatim (no extension guessing)", async () => {
    // name says .bin, but the handle knows it's a png
    const handle = {
      name: "blob.bin",
      type: "image/png",
      exists: async () => true,
      bytes: async () => new Uint8Array(),
      stream: () =>
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode("PNG"));
            c.close();
          },
        }),
    };
    const res = await server()
      .get("/x", () => handle as any)
      .test()
      .get("/x");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(await res.text()).toBe("PNG");
  });

  it("only the guarded route can reach it (auth pattern)", async () => {
    const bucket = await seed("private.txt", "secret");
    const app = server().get("/file", (ctx) => {
      if (ctx.url.query.token !== "ok") return 401;
      return bucket.file("private.txt");
    });
    expect((await app.test().get("/file")).status).toBe(401);
    const ok = await app.test().get("/file?token=ok");
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("secret");
  });
});
