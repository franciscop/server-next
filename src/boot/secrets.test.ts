import server from "..";

describe("the `secret` to `secrets` rename", () => {
  it("refuses the old option instead of ignoring it", () => {
    expect(() => server({ secret: "s3cret" } as any)).toThrow(
      /`secret` option is now `secrets`/,
    );
  });

  it("refuses the old environment variable", () => {
    const env = globalThis.env as Record<string, string | undefined>;
    env.SECRET = "s3cret";
    try {
      expect(() => server()).toThrow(/SECRET environment variable is now/);
    } finally {
      delete env.SECRET;
    }
  });

  it("reads a comma-separated SECRETS, newest first", () => {
    const env = globalThis.env as Record<string, string | undefined>;
    env.SECRETS = " new-key , old-key ";
    try {
      expect(server().settings.secrets).toEqual(["new-key", "old-key"]);
    } finally {
      delete env.SECRETS;
    }
  });
});
