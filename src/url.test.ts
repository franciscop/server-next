import server from ".";

describe("can match the url", () => {
  it("stops at the first matching route", async () => {
    const api = server()
      .get("/:id", (ctx) => ctx.url.params)
      .get("/*", (ctx) => ctx.url.params)
      .test();

    const res = await api.get("/hello");
    expect(res.headers.get("content-type")).toEqual("application/json");
    expect(await res.json()).toEqual({ id: "hello" });
  });

  it("but it doesn't if it's a use", async () => {
    const api = server()
      .use(() => {}) // No-op
      .get("/:id", (ctx) => ctx.url.params)
      .get("/*", (ctx) => ctx.url.params)
      .test();

    const res = await api.get("/hello");
    expect(res.headers.get("content-type")).toEqual("application/json");
    expect(await res.json()).toEqual({ id: "hello" });
  });
});

// `.test()` sends to localhost by default, but a full http(s) URL is used
// as-is so a test can exercise whatever host the app runs on.
describe("the host under test", () => {
  const api = server()
    .get("/x", (ctx) => ({
      href: ctx.url.href,
      hostname: ctx.url.hostname,
      origin: ctx.url.origin,
    }))
    .test();

  it("serves a plain path from localhost", async () => {
    const { hostname, origin } = await (await api.get("/x")).json();
    expect(hostname).toBe("localhost");
    expect(origin).toBe("http://localhost:3000");
  });

  it("keeps the host of a full URL", async () => {
    const { hostname, origin } = await (
      await api.get("https://bucketjs.com/x")
    ).json();
    expect(hostname).toBe("bucketjs.com");
    expect(origin).toBe("https://bucketjs.com");
  });

  it("keeps a subdomain, port and query", async () => {
    const { href, hostname } = await (
      await api.get("http://sub.example.com:8080/x?q=1")
    ).json();
    expect(hostname).toBe("sub.example.com");
    expect(href).toBe("http://sub.example.com:8080/x?q=1");
  });

  it("refuses a scheme other than http(s)", async () => {
    expect(api.get("ws://example.com/x")).rejects.toThrow(/Only http\(s\)/);
  });
});
