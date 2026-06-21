import server from "..";

describe("favicon", () => {
  it("replies 204 to /favicon.ico by default", async () => {
    const res = await server()
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(204);
  });

  it("serves the configured favicon file", async () => {
    // readme.md stands in for an icon file in this test
    const res = await server({ favicon: "./readme.md" })
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("# Server");
  });

  it("serves the favicon from a bucket", async () => {
    const bucket = {
      read: async (name: string) =>
        name === "favicon.ico" ? new Response("ICON").body : null,
      write: async () => {},
      delete: async () => true,
    };
    const res = await server({ favicon: bucket })
      .get("/", () => "home")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("icon");
    expect(await res.text()).toBe("ICON");
  });

  it("does not hijack a user-defined /favicon.ico route", async () => {
    const res = await server()
      .get("/favicon.ico", () => "my-icon")
      .test()
      .get("/favicon.ico");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("my-icon");
  });

  it("does not affect other routes", async () => {
    const res = await server()
      .get("/", () => "home")
      .test()
      .get("/");
    expect(await res.text()).toBe("home");
  });
});
