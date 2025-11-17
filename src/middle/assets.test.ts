import server from "../";

describe("static assets", () => {
  it("can serve a simple file", async () => {
    const app = server({ public: "./" }).test();
    const res = await app.get("/readme.md");
    expect(res.body.includes("# Server")).toBe(true);
    expect(res.headers["content-type"]).toBe("text/markdown");
  });
});
