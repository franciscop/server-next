import server, { router, status } from "./index.js";

const url = (path, options = {}) =>
  new Request("http://localhost:3000" + path, options);

describe("can route properly", () => {
  const api = router()
    .get("/hello", (ctx) => "Hello " + ctx.url.pathname)
    .put("/hello", (ctx) => "Hello " + ctx.url.pathname)
    .post("/hello", (ctx) => "Hello " + ctx.url.pathname);

  const app = server()
    .router("/", api)
    .router("/api/", api)
    .get("/", () => "Fallback");

  // INTERNAL - so this might change in the future
  it("has the correct structure", () => {
    const registeredPaths = app.handlers.get.map((h) => h[1]);
    expect(registeredPaths).toEqual(["/hello", "/api/hello", "/"]);
  });

  it("can get fallback when nothing matches", async () => {
    const res = await app.fetch(url("/"));
    expect(await res.text()).toBe("Fallback");
  });

  it("can get the base get", async () => {
    const res = await app.fetch(url("/hello"));
    expect(await res.text()).toBe("Hello /hello");
  });

  it("can get the nested get", async () => {
    const res = await app.fetch(url("/api/hello"));
    expect(await res.text()).toBe("Hello /api/hello");
  });

  it("can post to the base get", async () => {
    const res = await app.fetch(url("/hello", { method: "POST" }));
    expect(await res.text()).toBe("Hello /hello");
  });

  it("can post to the nested get", async () => {
    const res = await app.fetch(url("/api/hello", { method: "POST" }));
    expect(await res.text()).toBe("Hello /api/hello");
  });

  it("no status reuse", async () => {
    const app = server()
      .get("/a", () => status(201).send("hello"))
      .get("/b", () => ({ hello: "bye" }))
      .get("/", () => "Fallback");
    const resA = await app.fetch(url("/a"));
    expect(resA.status).toBe(201);
    const resB = await app.fetch(url("/b"));
    expect(resB.status).toBe(200);
  });
});
