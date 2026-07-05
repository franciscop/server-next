import server from "../";
import { cleanupBuckets, realBucket } from "../tests/realBucket";

describe("static assets", () => {
  it("can serve a simple file", async () => {
    const app = server({ public: "./" }).test();
    const res = await app.get("/readme.md");
    expect(res.headers.get("content-type")).toBe("text/markdown");
    expect(await res.text()).toContain("# Server");
  });

  it("sets Cache-Control, ETag and Last-Modified", async () => {
    const app = server({ public: "./" }).test();
    const res = await app.get("/readme.md");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(res.headers.get("etag")).toMatch(/^W\/".+"$/);
    expect(res.headers.get("last-modified")).toBeTruthy();
  });

  it("returns 304 for a matching If-None-Match", async () => {
    const app = server({ public: "./" }).test();
    const first = await app.get("/readme.md");
    const etag = first.headers.get("etag")!;

    const res = await app.get("/readme.md", {
      headers: { "if-none-match": etag },
    });
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe(etag);
    expect(await res.text()).toBe("");
  });

  it("advertises Accept-Ranges on a full response", async () => {
    const app = server({ public: "./" }).test();
    const res = await app.get("/readme.md");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
  });

  it("serves a byte range as 206", async () => {
    const app = server({ public: "./" }).test();
    const full = Buffer.from(await (await app.get("/readme.md")).arrayBuffer());

    const res = await app.get("/readme.md", {
      headers: { range: "bytes=0-9" },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-length")).toBe("10");
    expect(res.headers.get("content-range")).toBe(`bytes 0-9/${full.length}`);
    const part = Buffer.from(await res.arrayBuffer());
    expect(part).toEqual(full.subarray(0, 10));
  });

  it("serves a suffix range", async () => {
    const app = server({ public: "./" }).test();
    const full = Buffer.from(await (await app.get("/readme.md")).arrayBuffer());

    const res = await app.get("/readme.md", {
      headers: { range: "bytes=-8" },
    });
    expect(res.status).toBe(206);
    const part = Buffer.from(await res.arrayBuffer());
    expect(part).toEqual(full.subarray(full.length - 8));
  });

  it("returns 416 for an unsatisfiable range", async () => {
    const app = server({ public: "./" }).test();
    const res = await app.get("/readme.md", {
      headers: { range: "bytes=999999999-" },
    });
    expect(res.status).toBe(416);
    expect(res.headers.get("content-range")).toMatch(/^bytes \*\/\d+$/);
  });
});

describe("static assets over a real bucket (bucket lib)", () => {
  afterAll(cleanupBuckets);

  it("serves ranges via the real bucket's slice()", async () => {
    const bucket = realBucket();
    await bucket.file("data.bin").write("0123456789ABCDEF"); // 16 bytes
    const app = server({ public: bucket }).test();

    const full = await app.get("/data.bin");
    expect(await full.text()).toBe("0123456789ABCDEF");
    expect(full.headers.get("accept-ranges")).toBe("bytes");

    // closed range
    const res = await app.get("/data.bin", { headers: { range: "bytes=4-7" } });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 4-7/16");
    expect(res.headers.get("content-length")).toBe("4");
    expect(await res.text()).toBe("4567");

    // suffix range
    const suffix = await app.get("/data.bin", { headers: { range: "bytes=-4" } });
    expect(suffix.status).toBe(206);
    expect(await suffix.text()).toBe("CDEF");

    // open-ended range
    const open = await app.get("/data.bin", { headers: { range: "bytes=10-" } });
    expect(await open.text()).toBe("ABCDEF");

    // unsatisfiable
    const bad = await app.get("/data.bin", { headers: { range: "bytes=100-" } });
    expect(bad.status).toBe(416);
  });
});
