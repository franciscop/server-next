import server from "..";
import { cleanupBuckets, realBucket } from "../tests/realBucket";

afterAll(cleanupBuckets);

describe("favicon", () => {
  it("404s /favicon.ico when none is configured", async () => {
    const res = await server()
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(404);
  });

  it("serves the configured favicon file", async () => {
    // readme.md stands in for an icon file in this test
    const res = await server({ favicon: "./readme.md" })
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("# Server");
  });

  it("serves the favicon from a bucket file", async () => {
    const bucket = realBucket();
    await bucket.file("favicon.ico").write("ICON", { type: "image/x-icon" });
    const res = await server({ favicon: bucket.file("favicon.ico") })
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("icon");
    expect(await res.text()).toBe("ICON");
  });

  it("sets Cache-Control and an ETag", async () => {
    const bucket = realBucket();
    await bucket.file("favicon.ico").write("ICON");
    const res = await server({ favicon: bucket.file("favicon.ico") })
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(res.headers.get("etag")).toMatch(/^".+"$/);
  });

  it("returns 304 for a matching If-None-Match", async () => {
    const bucket = realBucket();
    await bucket.file("favicon.ico").write("ICON");
    const api = server({ favicon: bucket.file("favicon.ico") })
      .get("/", () => "home")
      .test();

    const first = await api.get("/favicon.ico");
    const etag = first.headers.get("etag")!;

    const second = await api.get("/favicon.ico", {
      headers: { "if-none-match": etag },
    });
    expect(second.status).toBe(304);
    expect(second.headers.get("etag")).toBe(etag);
    expect(await second.text()).toBe("");
  });

  it("caches the bytes after the first load (until restart)", async () => {
    const bucket = realBucket();
    const file = bucket.file("favicon.ico");
    await file.write("ORIGINAL");
    const api = server({ favicon: file })
      .get("/", () => "home")
      .test();

    expect(await (await api.get("/favicon.ico")).text()).toBe("ORIGINAL");

    // Change the underlying file: the cached response should NOT change.
    await file.write("CHANGED");
    expect(await (await api.get("/favicon.ico")).text()).toBe("ORIGINAL");
  });

  it("does not hijack a user-defined /favicon.ico route", async () => {
    const res = await server()
      .get("/favicon.ico", () => "my-icon")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("my-icon");
  });

  it("does not affect other routes", async () => {
    const res = await server()
      .get("/", () => "home")
      .test()
      .get("/");
    expect(await res.text()).toBe("home");
  });
});
