import server from ".";

// A server that echoes the derived client IP back as text
const ipServer = (options = {}) =>
  server(options)
    .get("/", (ctx) => ctx.ip)
    .test();

describe("ctx.ip", () => {
  it("trusts platform headers (cf-connecting-ip)", async () => {
    const res = await ipServer().get("/", {
      headers: { "cf-connecting-ip": "9.9.9.9" },
    });
    expect(await res.text()).toBe("9.9.9.9");
  });

  it("uses the first X-Forwarded-For hop by default", async () => {
    const res = await ipServer().get("/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(await res.text()).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP", async () => {
    const res = await ipServer().get("/", {
      headers: { "x-real-ip": "4.4.4.4" },
    });
    expect(await res.text()).toBe("4.4.4.4");
  });

  it("ignores X-Forwarded-For when trustProxy is false", async () => {
    const res = await ipServer({ security: { trustProxy: false } }).get("/", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(await res.text()).toBe("");
  });
});
