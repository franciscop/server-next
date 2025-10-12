import server from "../index.js";

const origin = "http://localhost:3000/";

describe("cors", () => {
  it("can simply enable the cors", async () => {
    const cors = "*";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });

    expect(headers).toEqual({
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
    });
  });

  it("can disable the cors", async () => {
    const cors = false;
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    expect(headers["access-control-allow-origin"]).toBe(undefined);
  });

  it("gets the wildcard without the origin", async () => {
    const cors = "*";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/");
    expect(headers["access-control-allow-origin"]).toBe("*");
  });

  it("gets the origin with true", async () => {
    const cors = true;
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    expect(headers["access-control-allow-origin"]).toBe(origin);
  });

  it("gets the correct origin with multiple as string", async () => {
    const cors = "https://a.com/,https://b.com/";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://b.com/" } });
    expect(headers["access-control-allow-origin"]).toBe("https://b.com/");
  });

  it("gets the correct origin with multiple as array", async () => {
    const cors = ["https://a.com/", "https://b.com/"];
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://b.com/" } });
    expect(headers["access-control-allow-origin"]).toBe("https://b.com/");
  });
});
