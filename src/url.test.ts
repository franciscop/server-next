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
