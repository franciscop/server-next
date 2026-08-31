import server from "..";
import { signJwt } from "./jwt";

// Cookies arrive ambiently: stale logins, other apps sharing localhost. A bad
// one is signed out; a bad bearer token was attached deliberately, so 401.
describe("broken credentials, by carrier", () => {
  const base = {
    providers: "github",
    onLogin: (p: any) => p.id,
    getUser: (id: string) => ({ id }),
  };
  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  it("a stale session cookie is anonymous, not a site-wide 401", async () => {
    const api = server({ secrets: "s", auth: base })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();
    const res = await api.get("/", {
      headers: { cookie: "session=left-over-from-another-app" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("anonymous");
  });

  it("a broken bearer token is still a 401 the client must see", async () => {
    const api = server({ secrets: "s", auth: { ...base, strategy: "token" } })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();
    const res = await api.get("/", {
      headers: { authorization: "Bearer tampered" },
    });
    expect(res.status).toBe(401);
  });

  it("another Authorization scheme is not ours to police", async () => {
    const api = server({ secrets: "s", auth: { ...base, strategy: "token" } })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();
    const res = await api.get("/", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("anonymous");
  });
});

// A credential the server can no longer verify (a rotated secret, an upgrade,
// another app's cookie on the same host) should not follow someone around.
describe("a stale cookie clears itself", () => {
  const auth = {
    providers: "github",
    onLogin: (p: any) => p.id,
    getUser: (id: string) => ({ id }),
  };
  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  it("is anonymous, and clears the cookie so a refresh is clean", async () => {
    const api = server({ secrets: "s", auth })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();

    const res = await api.get("/", {
      headers: { cookie: "session=left-over-from-before-the-upgrade" },
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("anonymous");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session=");
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });

  it("leaves a valid cookie alone", async () => {
    const token = await signJwt({ sub: "u1" }, "s", 3600);
    const api = server({ secrets: "s", auth })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();

    const res = await api.get("/", { headers: { cookie: `session=${token}` } });
    expect((await res.json()).id).toBe("u1");
    expect(res.headers.get("set-cookie") ?? "").not.toContain("Max-Age=0");
  });

  it("says nothing when there was no cookie at all", async () => {
    const api = server({ secrets: "s", auth })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();
    const res = await api.get("/");
    expect(res.headers.get("set-cookie")).toBe(null);
  });
});

// A cookie that cannot verify is handled silently, but an operator turning
// logging on should be told why, especially the one cause they can fix.
describe("logging a discarded cookie", () => {
  const auth = {
    providers: "github",
    onLogin: (p: any) => p.id,
    getUser: (id: string) => ({ id }),
  };
  const realLog = console.log;
  let lines: string[];

  beforeEach(() => {
    lines = [];
    console.log = (...args: any[]) => lines.push(args.join(" "));
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });
  afterEach(() => {
    console.log = realLog;
  });

  const hit = async (cookie: string, log: any = "info") => {
    const api = server({ secrets: "s", log, auth })
      .get("/", (ctx) => ctx.user ?? "anonymous")
      .test();
    return api.get("/", { headers: { cookie: `session=${cookie}` } });
  };

  it("names the fixable cause: signed with a key that is gone", async () => {
    // A real credential, signed with a secret this app no longer has
    const orphan = await signJwt({ sub: "u1" }, "the-previous-secret", 3600);
    await hit(orphan);
    const said = lines.join(" ");
    expect(said).toContain("discarded a session cookie");
    expect(said).toContain("SECRETS");
  });

  it("says something quieter for a cookie that is not ours at all", async () => {
    await hit("left-over-from-another-app");
    const said = lines.join(" ");
    expect(said).toContain("was not issued by this app");
    // Not the rotation advice: this one is nobody's fault
    expect(said).not.toContain("SECRETS");
  });

  it("says nothing at all with logging off", async () => {
    await hit("left-over-from-another-app", false);
    expect(lines.join(" ")).toBe("");
  });

  it("never logs the token or its contents", async () => {
    const orphan = await signJwt(
      { sub: "u1", email: "ada@secret.example" },
      "the-previous-secret",
      3600,
    );
    await hit(orphan);
    const said = lines.join(" ");
    // Unverified claims are attacker-controlled: they must not reach the log
    expect(said).not.toContain("ada@secret.example");
    expect(said).not.toContain(orphan.slice(0, 24));
  });
});

// `ctx.auth` is what the credential itself asserts, with no lookup behind it.
// See docs/5. Authentication.md.
describe("ctx.auth", () => {
  const rows = new Map([["u1", { id: "u1", email: "ada@x.com" }]]);
  const base = {
    providers: "github",
    onLogin: (profile: any) => profile.id,
    getUser: (id: string) => rows.get(id),
  };

  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  const app = (extra: any = {}) =>
    server({ secrets: "s", auth: { ...base, ...extra } }).get("/auth", (ctx) =>
      ctx.auth ? { ...ctx.auth, user: (ctx.user as any)?.id } : "none",
    );

  it("is absent without a credential", async () => {
    expect(await (await app().test().get("/auth")).text()).toBe("none");
  });

  it("carries the issue and expiry times", async () => {
    const token = await signJwt({ sub: "u1" }, "s", 3600);
    const body = await (
      await app().test().get("/auth", { headers: { cookie: `session=${token}` } })
    ).json();

    const issued = new Date(body.issuedAt).getTime();
    const expires = new Date(body.expiresAt).getTime();
    expect(Date.now() - issued).toBeLessThan(5000);
    expect(Math.round((expires - issued) / 1000)).toBe(3600);
    expect(body.user).toBe("u1");
  });

  it("says how this request authenticated", async () => {
    const jwt = app({ strategy: "jwt", toPublicUser: (u: any) => u });
    const token = await signJwt({ sub: "u1", user: { id: "u1" } }, "s", 3600);

    const viaHeader = await jwt
      .test()
      .get("/auth", { headers: { authorization: `Bearer ${token}` } });
    expect((await viaHeader.json()).strategy).toBe("jwt");

    const session = app({});
    const viaCookie = await session
      .test()
      .get("/auth", { headers: { cookie: `session=${token}` } });
    expect((await viaCookie.json()).strategy).toBe("session");
  });

  it("carries the provider a login came through", async () => {
    // Signed in at login, so it survives without a lookup of yours
    const token = await signJwt({ sub: "u1", provider: "github" }, "s", 3600);
    const body = await (
      await app().test().get("/auth", { headers: { cookie: `session=${token}` } })
    ).json();
    expect(body.provider).toBe("github");
  });

  it("is absent for a function, which has no credential of ours to read", async () => {
    const custom = server({ auth: () => ({ id: "u1" }) }).get("/auth", (ctx) =>
      ctx.auth ? "some" : "none",
    );
    expect(await (await custom.test().get("/auth")).text()).toBe("none");
  });
});

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
