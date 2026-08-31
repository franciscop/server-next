import server from "../index";

// HEAD is GET without the body (RFC 9110): GET routes answer HEAD requests
// with the same headers and an empty body, unless an explicit .head() matches
describe("HEAD requests", () => {
  it("a GET route answers HEAD with the headers, no body", async () => {
    const api = server()
      .get("/hello", () => ({ hello: "world" }))
      .test();
    const res = await api.head("/hello");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.text()).toBe("");
  });

  it("carries the GET's cache headers: Cache-Control and ETag match", async () => {
    const api = server({ cache: "1h" })
      .get("/hello", () => ({ hello: "world" }))
      .test();
    const get = await api.get("/hello");
    const head = await api.head("/hello");
    expect(head.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(head.headers.get("etag")).toBe(get.headers.get("etag"));
    expect(await head.text()).toBe("");
  });

  it("an explicit .head() route wins over the GET fallback", async () => {
    const api = server()
      .head("/hello", () => 204)
      .get("/hello", () => "with a body")
      .test();
    expect((await api.head("/hello")).status).toBe(204);
    expect(await (await api.get("/hello")).text()).toBe("with a body");
  });

  it("does not answer for other methods", async () => {
    const api = server()
      .post("/submit", () => 201)
      .test();
    expect((await api.head("/submit")).status).toBe(404);
  });

  it("serves static assets, cache validators included", async () => {
    const api = server({ public: "./" }).test();
    const res = await api.head("/readme.md");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("etag")).toBeTruthy();
    expect(await res.text()).toBe("");
  });
});
