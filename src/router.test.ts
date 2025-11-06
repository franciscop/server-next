import server, { status } from "./index.js";
import router from "./router.js";

function expandHandlers(handlers) {
  const expandedHandlers = [];
  const middlewareStack = [];

  handlers.forEach((handler) => {
    const verb = handler[0];
    const path = handler[1];
    const fns = handler.slice(2);

    if (verb === "*") {
      // accumulate middleware
      middlewareStack.push(...fns);
    } else {
      // leaf route
      expandedHandlers.push([path, ...middlewareStack, ...fns]);
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
    .use("/", apiRouter)
    .use("/api/", apiRouter)
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
});

describe("complex routing", () => {
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
  const mid15 = () => null;

  const router1 = router()
    .use(mid6)
    .get("/path2", mid7, mid8)
    .get("/path3", mid9)
    .get(mid10);

  const router2 = router()
    .use(mid12)
    .get("/path2", mid13, mid14)
    .get("/path3", mid15);

  const api = server()
    .use(mid1)
    .use(mid2, mid3)
    .get("/path1", mid4)
    .use(mid5)
    .use("/sub1/*", router1)
    .use(mid11)
    .use("/sub2/*", router2);

  it("extracts the right paths", () => {
    const handlers = expandHandlers(api.handlers.get);
    expect(handlers.map((h) => h[0])).toEqual([
      "/path1",
      "/sub1/path2",
      "/sub1/path3",
      "/sub1/*",
      "/sub2/path2",
      "/sub2/path3",
    ]);
  });

  it("has the right callbacks", () => {
    const handlers = expandHandlers(api.handlers.get);
    const part1 = handlers.find((h) => h[0] === "/path1");
    const part2 = handlers.find((h) => h[0] === "/sub1/path2");

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

describe("nested routing", () => {
  const mid1 = () => null;
  const mid2 = () => null;
  const mid3 = () => null;
  const mid4 = () => null;
  const mid5 = () => null;
  const mid6 = () => null;
  const mid7 = () => null;

  const api = server()
    .use(mid1)
    .use(router().use(mid2))
    .use(router().get("/", mid3))
    .use("/users/*", router().use(mid4).get("/me", mid5, mid6))
    .use(
      "/a/*",
      router().use("/b/*", router().use("/c/*", router().get("/d", mid7))),
    );

  it("has the right paths", () => {
    const paths = expandHandlers(api.handlers.get).map((p) => p[0]);
    expect(paths).toEqual(["/", "/users/me", "/a/b/c/d"]);
  });

  it("has the right callbacks", () => {
    const [home, userMe, nested] = expandHandlers(api.handlers.get);
    const timer = home[1];
    const assets = home[2];

    expect(home).toEqual(["/", timer, assets, mid1, mid2, mid3]);
    expect(userMe).toEqual([
      "/users/me",
      timer,
      assets,
      mid1,
      mid2,
      mid4,
      mid5,
      mid6,
    ]);
    expect(nested).toEqual(["/a/b/c/d", timer, assets, mid1, mid2, mid4, mid7]);
  });
});
