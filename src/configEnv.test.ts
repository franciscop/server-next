import server from ".";

describe("PUBLIC / FAVICON env vars", () => {
  it("reads public from the PUBLIC env var", () => {
    Object.assign(globalThis.env, { PUBLIC: "./public" });
    try {
      expect(server().settings.public).not.toBeNull();
    } finally {
      delete globalThis.env.PUBLIC;
    }
  });

  it("reads favicon from the FAVICON env var", () => {
    Object.assign(globalThis.env, { FAVICON: "./logo.png" });
    try {
      expect(server().settings.favicon).toBe("./logo.png");
    } finally {
      delete globalThis.env.FAVICON;
    }
  });

  it("an explicit option wins over the env var", () => {
    Object.assign(globalThis.env, { FAVICON: "./from-env.png" });
    try {
      expect(server({ favicon: "./from-option.png" }).settings.favicon).toBe(
        "./from-option.png",
      );
    } finally {
      delete globalThis.env.FAVICON;
    }
  });
});
