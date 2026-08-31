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
