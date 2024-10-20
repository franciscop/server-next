import server, { router, status } from "./index.js";

describe("can route properly", () => {
  const apiRouter = router()
    .get("/hello", (ctx) => "Hello " + ctx.url.pathname)
    .put("/hello", (ctx) => "Hello " + ctx.url.pathname)
    .post("/hello", (ctx) => "Hello " + ctx.url.pathname);

  const app = server()
    .router("/", apiRouter)
    .router("/api/", apiRouter)
    .get("/", () => "Fallback");
  const api = app.test();

  // INTERNAL - so this might change in the future
  it("has the correct structure", () => {
    const registeredPaths = app.handlers.get.map((h) => h[1]);
    expect(registeredPaths).toEqual(["*", "/hello", "/api/hello", "/"]);
  });

  it("can get fallback when nothing matches", async () => {
    const res = await api.get("/");
    expect(res.data).toBe("Fallback");
  });

  it("can get the base get", async () => {
    const res = await api.get("/hello");
    expect(res.data).toBe("Hello /hello");
  });

  it("can get the nested get", async () => {
    const res = await api.get("/api/hello");
    expect(res.data).toBe("Hello /api/hello");
  });

  it("can post to the base get", async () => {
    const res = await api.post("/hello");
    expect(res.data).toBe("Hello /hello");
  });

  it("can post to the nested get", async () => {
    const res = await api.post("/api/hello");
    expect(res.data).toBe("Hello /api/hello");
  });

  it("no status reuse", async () => {
    const api = server()
      .get("/a", () => status(201).send("hello"))
      .get("/b", () => ({ hello: "bye" }))
      .get("/", () => "Fallback")
      .test();
    const { status: statusA } = await api.get("/a");
    expect(statusA).toBe(201);
    const { status: statusB } = await api.get("/b");
    expect(statusB).toBe(200);
  });
});
