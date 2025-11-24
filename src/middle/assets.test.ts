import server from "../";

describe("static assets", () => {
  it("can serve a simple file", async () => {
    const app = server({ public: "./" }).test();
    const res = await app.get("/readme.md");
    expect(res.headers.get("content-type")).toBe("text/markdown");
    expect(await res.text()).toContain("# Server");
  });
});
