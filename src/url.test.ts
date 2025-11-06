import server from "./index.js";

describe("can match the url", () => {
  it("stops at the first matching route", async () => {
    const api = server()
      .get("/:id", (ctx) => ctx.url.params)
      .get("/*", (ctx) => ctx.url.params)
      .test();

    const { body, headers } = await api.get("/hello");
    expect(body).toEqual({ id: "hello" });
    expect(headers["content-type"]).toEqual("application/json");
  });

  it("but it doesn't if it's a use", async () => {
    const api = server()
      .use(() => {}) // No-op
      .get("/:id", (ctx) => ctx.url.params)
      .get("/*", (ctx) => ctx.url.params)
      .test();

    const { body, headers, ...rest } = await api.get("/hello");
    expect(body).toEqual({ id: "hello" });
    expect(headers["content-type"]).toEqual("application/json");
  });
});
