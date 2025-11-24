import server from "..";

const origin = "http://localhost:3000/";

describe("cors", () => {
  it("can simply enable the cors", async () => {
    const cors = "*";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });

    expect(headers.get("access-control-allow-origin")).toBe("*");
    expect(headers.get("access-control-allow-headers")).toBe("*");
    expect(headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
    );
  });

  it("can disable the cors", async () => {
    const cors = false;
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    expect(headers.get("access-control-allow-origin")).toBe(null);
  });

  it("gets the wildcard without the origin", async () => {
    const cors = "*";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/");
    expect(headers.get("access-control-allow-origin")).toBe("*");
  });

  it("gets the origin with true", async () => {
    const cors = true;
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    expect(headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("gets the correct origin with multiple as string", async () => {
    const cors = "https://a.com/,https://b.com/";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://b.com/" } });
    expect(headers.get("access-control-allow-origin")).toBe("https://b.com/");
  });

  it("gets the correct origin with multiple as array", async () => {
    const cors = ["https://a.com/", "https://b.com/"];
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://b.com/" } });
    expect(headers.get("access-control-allow-origin")).toBe("https://b.com/");
  });
});
