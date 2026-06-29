import server, { status } from ".";
import router from "./router";

describe("basic routing", () => {
  const api = server()
    .get("/", () => "Home")
    .get("/hello", (ctx) => `Hello ${ctx.url.pathname}`)
    .post("/hello", (ctx) => `Posted ${ctx.url.pathname}`)
    .delete("/hello", () => "Deleted")
    .test();

  it("matches a GET route", async () => {
    expect(await (await api.get("/hello")).text()).toBe("Hello /hello");
  });
  it("matches a POST route", async () => {
    expect(await (await api.post("/hello")).text()).toBe("Posted /hello");
  });
  it("matches a DELETE route", async () => {
    expect(await (await api.delete("/hello")).text()).toBe("Deleted");
  });
  it("matches the home route", async () => {
    expect(await (await api.get("/")).text()).toBe("Home");
  });
  it("404s an unknown route", async () => {
    expect((await api.get("/nope")).status).toBe(404);
  });
});

describe("status is not reused between routes", () => {
  const api = server()
    .get("/a", () => status(201).send("hello"))
    .get("/b", () => ({ hello: "bye" }))
    .test();

  it("keeps a per-route status", async () => {
    expect((await api.get("/a")).status).toBe(201);
    expect((await api.get("/b")).status).toBe(200);
  });
});

describe("merging a router at the root", () => {
  const usersRouter = router()
    .get("/users", () => "list")
    .get("/users/:id", (ctx) => `user ${ctx.url.params.id}`);

  const api = server()
    .use(usersRouter)
    .get("/", () => "Home")
    .test();

  it("serves the merged routes (full paths)", async () => {
    expect(await (await api.get("/users")).text()).toBe("list");
    expect(await (await api.get("/users/42")).text()).toBe("user 42");
  });
  it("still serves the host's own routes", async () => {
    expect(await (await api.get("/")).text()).toBe("Home");
  });
});

describe("middleware order and flattening", () => {
  it("runs global then route middleware, in registration order", async () => {
    const calls: string[] = [];
    const m = (name: string) => () => {
      calls.push(name);
    };
    const api = server()
      .use(m("g1"))
      .use(m("g2"), m("g3"))
      .get("/a", m("r1"), () => {
        calls.push("handler");
        return "ok";
      })
      .test();

    await api.get("/a");
    expect(calls).toEqual(["g1", "g2", "g3", "r1", "handler"]);
  });

  it("only applies middleware to routes registered after them", async () => {
    const calls: string[] = [];
    const api = server()
      .get("/before", () => "before")
      .use(() => {
        calls.push("mid");
      })
      .get("/after", () => "after")
      .test();

    await api.get("/before");
    expect(calls).toEqual([]); // the .use() came later, so it doesn't apply here
    await api.get("/after");
    expect(calls).toEqual(["mid"]);
  });

  it("stores routes as { path, options, fns } objects", () => {
    const app = server().get("/a", () => "A");
    const [route] = app.handlers.get;
    expect(route.path).toBe("/a");
    expect(Array.isArray(route.fns)).toBe(true);
    expect(route.fns.at(-1)).toBeInstanceOf(Function); // the handler is last
  });
});

describe("router-scoped middleware", () => {
  it("applies a router's own .use() to that router's routes only", async () => {
    const calls: string[] = [];
    const guarded = router()
      .use(() => {
        calls.push("guard");
      })
      .get("/private", () => "private");

    const api = server()
      .use(guarded)
      .get("/public", () => "public")
      .test();

    await api.get("/public");
    expect(calls).toEqual([]); // guard not in the host route
    await api.get("/private");
    expect(calls).toEqual(["guard"]);
  });
});

describe("global middleware as a fallthrough", () => {
  it("can answer a request that matches no route", async () => {
    const api = server()
      .use((ctx) => {
        if (ctx.url.pathname === "/static") return "served";
      })
      .get("/", () => "home")
      .test();

    expect(await (await api.get("/static")).text()).toBe("served");
    expect((await api.get("/nope")).status).toBe(404);
  });
});

describe("per-route options", () => {
  it("merges route options over the global settings (local wins)", async () => {
    const api = server({ secret: "g" })
      .get("/a", { tags: "x", title: "T" }, (ctx) => ({
        tags: (ctx.options as any).tags,
        title: (ctx.options as any).title,
        secret: ctx.options.secret,
      }))
      .get("/b", (ctx) => ({ tags: (ctx.options as any).tags ?? null }))
      .test();

    expect(await (await api.get("/a")).json()).toEqual({
      tags: "x",
      title: "T",
      secret: "g",
    });
    expect(await (await api.get("/b")).json()).toEqual({ tags: null });
  });
});
