import server from ".";

describe("onResponse", () => {
  it("replaces the outgoing response when it returns a Response", async () => {
    const api = server({
      onResponse: () => new Response("replaced", { status: 201 }),
    })
      .get("/", () => "original")
      .test();
    const res = await api.get("/");
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("replaced");
  });

  it("leaves the response unchanged when it returns nothing", async () => {
    let contentType: string | null = null;
    const api = server({
      onResponse: (res) => {
        contentType = res.headers.get("content-type"); // inspect only
      },
    })
      .get("/", () => "hi")
      .test();
    const res = await api.get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hi");
    expect(contentType).toContain("text/plain"); // saw the real response
  });

  it("can mutate and return the original response", async () => {
    const api = server({
      onResponse: (res) => {
        res.headers.set("x-app", "1");
        return res;
      },
    })
      .get("/", () => "ok")
      .test();
    const res = await api.get("/");
    expect(res.headers.get("x-app")).toBe("1");
    expect(await res.text()).toBe("ok");
  });

  it("fires for 404s (custom not-found)", async () => {
    const api = server({
      onResponse: (res) =>
        res.status === 404 ? new Response("nope", { status: 404 }) : res,
    })
      .get("/exists", () => "yes")
      .test();
    const res = await api.get("/missing");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("nope");
  });

  it("fires for onError output", async () => {
    const api = server({
      onError: () => new Response("boom", { status: 500 }),
      onResponse: (res) =>
        new Response(`wrapped:${res.status}`, { status: res.status }),
    })
      .get("/", () => {
        throw new Error("x");
      })
      .test();
    const res = await api.get("/");
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("wrapped:500");
  });

  it("receives the ctx (method + url)", async () => {
    let method: string | undefined;
    let pathname: string | undefined;
    const api = server({
      onResponse: (_res, ctx) => {
        method = ctx.method;
        pathname = ctx.url.pathname;
      },
    })
      .get("/thing", () => "ok")
      .test();
    await api.get("/thing");
    expect(method).toBe("get");
    expect(pathname).toBe("/thing");
  });

  it("supports an async hook", async () => {
    const api = server({
      onResponse: async (res) => {
        await Promise.resolve();
        return new Response(await res.text(), {
          status: res.status,
          headers: { "x-async": "yes" },
        });
      },
    })
      .get("/", () => "body")
      .test();
    const res = await api.get("/");
    expect(res.headers.get("x-async")).toBe("yes");
    expect(await res.text()).toBe("body");
  });
});
