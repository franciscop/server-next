import cookieParser from "./cookieParser.js";

describe("middleware/cookieParser", () => {
  it("is a function", () => {
    expect(cookieParser).toBeDefined();
    expect(typeof cookieParser).toBe("function");
  });

  it("can work with localhost", async () => {
    const ctx = {
      headers: { cookie: "name=value; name2=value2; name3=value3" }
    };
    await cookieParser(ctx);
    expect(ctx.headers.cookie).toBe("name=value; name2=value2; name3=value3");
    expect(ctx.cookies).toEqual({
      name: "value",
      name2: "value2",
      name3: "value3"
    });
  });
});
