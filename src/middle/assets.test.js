import server from "../";

describe("static assets", () => {
  it("can serve a simple file", async () => {
    const app = server({ public: "./src/middle/" }).test();
    const { body, headers } = await app.get("/assets.test.js");
    expect(body).toInclude("describe");
    expect(headers["content-type"]).toBe("text/javascript");
  });
});
