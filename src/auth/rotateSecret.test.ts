import { signJwt } from "../helpers/jwt";
import server from "..";

// A rotation must not sign everyone out: move the live key into second place,
// put a new one first, and the credentials already in the wild keep working.
describe("rotating `secrets` with a live login", () => {
  const OLD = "old-key";
  const NEW = "new-key";
  const rows = new Map([["u1", { id: "u1", email: "a@b.c" }]]);

  const app = (secrets: string | string[]) =>
    server({
      secrets,
      auth: {
        providers: "github",
        onLogin: (profile) => profile.id,
        getUser: (id: string) => rows.get(id),
      },
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

  const me = (instance: ReturnType<typeof app>, cookie: string) =>
    instance.test().get("/me", { headers: { cookie: `session=${cookie}` } });

  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  it("accepts a credential issued before the rotation", async () => {
    const before = await signJwt({ sub: "u1" }, OLD, 3600);

    expect((await me(app(OLD), before)).status).toBe(200);
    expect((await me(app([NEW, OLD]), before)).status).toBe(200);

    // ...and once the old key is dropped, those sessions are signed out: a
    // stale cookie is anonymous rather than an error
    expect(await (await me(app([NEW]), before)).text()).toBe("anonymous");
  });

  it("signs new credentials with the first key", async () => {
    const after = await signJwt({ sub: "u1" }, NEW, 3600);
    expect((await me(app([NEW, OLD]), after)).status).toBe(200);
    expect(await (await me(app([OLD]), after)).text()).toBe("anonymous");
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
