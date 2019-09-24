import urlParser from "./urlParser.js";

describe("middleware/urlParser", () => {
  it("is a function", () => {
    expect(urlParser).toBeDefined();
    expect(typeof urlParser).toBe("function");
  });

  it("can work with localhost", async () => {
    const ctx = {
      url: "http://hello:world@localhost:3000/abc/def?lang=español"
    };
    await urlParser(ctx);
    expect(ctx).toEqual({
      host: "localhost:3000",
      hostname: "localhost",
      origin: "http://localhost:3000",
      password: "world",
      path: "/abc/def",
      port: "3000",
      protocol: "http:",
      query: { lang: "español" },
      url: "http://hello:world@localhost:3000/abc/def?lang=español",
      username: "hello"
    });
  });
});
