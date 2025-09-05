import server, { router, status } from "./index.js";

function expandHandlers(handlers) {
  const expandedHandlers = [];
  const middlewareStack = [];

  // Extract and process middleware
  handlers.forEach((handler) => {
    if (handler[0] === "*") {
      middlewareStack.push(handler.slice(2));
    } else {
      const path = handler[1];
      const fns = handler.slice(2);
      expandedHandlers.push([path, ...middlewareStack.flat(), ...fns]);
    }
  });

  return expandedHandlers;
}

describe("can route properly", () => {
  const apiRouter = router()
    .get("/hello", (ctx) => `Hello ${ctx.url.pathname}`)
    .put("/hello", (ctx) => `Hello ${ctx.url.pathname}`)
    .post("/hello", (ctx) => `Hello ${ctx.url.pathname}`);

  const app = server()
    .router("/", apiRouter)
    .router("/api/", apiRouter)
    .get("/", () => "Fallback");
  const api = app.test();

  // INTERNAL - so this might change in the future
  it("has the correct structure", () => {
    const registeredPaths = app.handlers.get.map((h) => h[1]);
    expect(registeredPaths).toEqual(["*", "*", "/hello", "/api/hello", "/"]);
  });

  it("can get fallback when nothing matches", async () => {
    const res = await api.get("/");
    expect(res.body).toBe("Fallback");
  });

  it("can get the base get", async () => {
    const res = await api.get("/hello");
    expect(res.body).toBe("Hello /hello");
  });

  it("can get the nested get", async () => {
    const res = await api.get("/api/hello");
    expect(res.body).toBe("Hello /api/hello");
  });

  it("can post to the base get", async () => {
    const res = await api.post("/hello");
    expect(res.body).toBe("Hello /hello");
  });

  it("can post to the nested get", async () => {
    const res = await api.post("/api/hello");
    expect(res.body).toBe("Hello /api/hello");
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

  it("can go through complex paths", () => {
    const mid1 = () => null;
    const mid2 = () => null;
    const mid3 = () => null;
    const mid4 = () => null;
    const mid5 = () => null;
    const mid6 = () => null;
    const mid7 = () => null;
    const mid8 = () => null;
    const mid9 = () => null;
    const mid10 = () => null;
    const mid11 = () => null;
    const mid12 = () => null;
    const mid13 = () => null;
    const mid14 = () => null;

    const router1 = router()
      .use(mid6)
      .get("/path2", mid7, mid8)
      .get("/path3", mid9);

    const router2 = router()
      .use(mid11)
      .get("/path2", mid12, mid13)
      .get("/path3", mid14);

    const api = server()
      .use(mid1)
      .use(mid2, mid3)
      .get("/path1", mid4)
      .use(mid5)
      .router("/sub1/*", router1)
      .use(mid10)
      .router("/sub2/*", router2);

    // api.handlers.get.map((g) => console.log(g));
    const handlers = expandHandlers(api.handlers.get);
    const part1 = handlers.find((h) => h[0] === "/path1");
    const part2 = handlers.find((h) => h[0] === "/sub1/path2");

    // console.log(handlers.map((h) => h[0]));
    // expect(handlers.map((h) => h[0])).toEqual([
    //   "/path1",
    //   "/sub1/path2",
    //   "/sub1/path3",
    //   "/sub1/*",
    //   "/sub2/path2",
    //   "/sub2/path3",
    //   "/sub2/*",
    //   "/*",
    // ]);

    const timer = part1[1];
    const assets = part1[2];

    expect(part1).toEqual(["/path1", timer, assets, mid1, mid2, mid3, mid4]);
    expect(part2).toEqual([
      "/sub1/path2",
      timer,
      assets,
      mid1,
      mid2,
      mid3,
      mid5,
      mid6,
      mid7,
      mid8,
    ]);
  });
});
