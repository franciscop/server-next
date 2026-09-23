import server from "../index";

describe("PUBLIC env var", () => {
  it("reads public from the PUBLIC env var", () => {
    Object.assign(globalThis.env, { PUBLIC: "./public" });
    try {
      expect(server().settings.public).not.toBeNull();
    } finally {
      delete globalThis.env.PUBLIC;
    }
  });
});

describe("the options object", () => {
  // Reused across servers (or tests), it must come back exactly as passed
  it("is not modified by the CORS environment fallback", () => {
    process.env.CORS = "https://a.com";
    globalThis.env.CORS = "https://a.com";
    const options = {};
    server(options);
    expect(options).toEqual({});
    delete process.env.CORS;
    delete (globalThis.env as any).CORS;
  });
});
