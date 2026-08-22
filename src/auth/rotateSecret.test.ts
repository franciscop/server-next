import kv from "polystore";
import server from "..";

// A rotation must not log everyone out: move the live key into second place,
// put a new one first, and the tokens already in the wild keep working.
describe("rotating `secrets` with a live jwt login", () => {
  const CREDENTIALS = { email: "abc@test.com", password: "11111111" };
  const OLD = "old-key";
  const NEW = "new-key";

  const users = kv(new Map());
  const app = (secrets: string | string[]) =>
    server({
      secrets,
      auth: { strategy: "jwt", providers: ["email"], users },
    }).get("/me", (ctx) => ctx.user || "No data");

  const before = app(OLD);
  const during = app([NEW, OLD]);
  const after = app([NEW]);

  const me = (instance: ReturnType<typeof app>, token: string) =>
    instance.test().get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });

  it("accepts a token issued before the rotation", async () => {
    const register = await before
      .test()
      .post("/auth/register/email", CREDENTIALS);
    const { token } = await register.json();

    expect((await me(before, token)).status).toBe(200);
    expect((await me(during, token)).status).toBe(200);

    // ...and stops once the old key is dropped, a full `expires` window later
    expect((await me(after, token)).status).toBe(401);
  });

  it("issues new tokens with the new key", async () => {
    const login = await during.test().post("/auth/login/email", CREDENTIALS);
    const { token } = await login.json();

    expect((await me(after, token)).status).toBe(200);
  });
});

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
