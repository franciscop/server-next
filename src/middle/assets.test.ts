import server from "../";

describe("static assets", () => {
  it("can serve a simple file", async () => {
    const app = server({ public: "./src/middle/" }).test();
    const res = await app.get("/assets.test.js");
    expect(res.body.includes("describe").toBe(true);
    expect(res.headers["content-type"]).toBe("text/javascript");
  });
});
