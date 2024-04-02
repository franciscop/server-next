import server from "./index.js";

describe("can match the url", () => {
  it("stops at the first matching route", async () => {
    const app = server()
      .get("/:id", (ctx) => ctx.url.params)
      .get("/*", (ctx) => ctx.url.params);

    const res = await app.fetch(new Request("http://localhost:3000/hello"));
    expect(await res.json()).toEqual({ id: "hello" });
  });

  it("but it doesn't if it's a use", async () => {
    const app = server()
      .use(() => {
        // No-op
      })
      .get("/:id", (ctx) => ctx.url.params)
      .get("/*", (ctx) => ctx.url.params);

    const res = await app.fetch(new Request("http://localhost:3000/hello"));
    expect(await res.json()).toEqual({ id: "hello" });
  });
});
