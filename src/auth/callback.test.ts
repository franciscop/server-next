import { signJwt } from "../helpers/jwt";
import server from "..";

// The full round trip against a stubbed GitHub: login, callback, and what the
// resulting cookie holds. What is signed must be safe for the client to keep,
// so the default toPublicUser strips `raw` and the tokens.
describe("the login callback", () => {
  const PROFILE = {
    id: 583231,
    login: "ada",
    name: "Ada Lovelace",
    email: "ada@x.com",
    avatar_url: "https://avatars.example/ada.png",
    company: "Analytical Engines",
  };

  const realFetch = globalThis.fetch;
  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
    globalThis.fetch = (async (url: any, opts: any) => {
      const one = url instanceof Request ? url.url : String(url);
      if (one.includes("github.com/login/oauth/access_token")) {
        return Response.json({ access_token: "gho_SECRET", token_type: "bearer" });
      }
      if (one.includes("api.github.com/user")) {
        return Response.json(PROFILE);
      }
      return realFetch(url, opts);
    }) as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  // Drive the real login redirect, then come back with its state
  const login = async (api: any) => {
    const res = await api.get("/auth/login/github");
    const state = new URL(res.headers.get("location")).searchParams.get("state");
    const cookie = res.headers.get("set-cookie").split(";")[0];
    return api.get(`/auth/callback/github?code=c0d3&state=${state}`, {
      headers: { cookie },
    });
  };

  const claims = (jwt: string) =>
    JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());

  it("signs a safe subset by default: no raw, no tokens", async () => {
    const api = server({ secrets: "s", auth: "cookie:github" }).test();
    const res = await login(api);
    expect(res.status).toBe(302);

    const session = res.headers
      .get("set-cookie")
      .split("session=")[1]
      .split(";")[0];
    const payload = claims(session);

    expect(payload.user).toEqual({
      id: "583231",
      email: "ada@x.com",
      name: "Ada Lovelace",
      avatar: "https://avatars.example/ada.png",
    });
    // The token and the raw payload never leave the server
    expect(session).not.toContain("gho_SECRET");
    expect(session).not.toContain("Analytical");
    // The provider rides alongside, for ctx.auth rather than ctx.user
    expect(payload.provider).toBe("github");
  });

  it("hands ctx.user the safe subset, and ctx.auth the provider", async () => {
    const app = server({ secrets: "s", auth: "cookie:github" }).get(
      "/whoami",
      (ctx) => ({ user: ctx.user, provider: ctx.auth?.provider }),
    );
    const api = app.test();
    const res = await login(api);
    const cookie = res.headers.get("set-cookie").split(";")[0];

    const body = await (await api.get("/whoami", { headers: { cookie } })).json();
    expect(body.user).toEqual({
      id: "583231",
      email: "ada@x.com",
      name: "Ada Lovelace",
      avatar: "https://avatars.example/ada.png",
    });
    expect(body.user.provider).toBe(undefined);
    expect(body.provider).toBe("github");
  });

  it("still hands onLogin the whole profile: tokens, raw and provider", async () => {
    let seen: any;
    const api = server({
      secrets: "s",
      auth: {
        providers: "github",
        onLogin: (profile) => {
          seen = profile;
          return profile.id;
        },
        getUser: (id: string) => ({ id }),
      },
    }).test();
    await login(api);

    expect(seen.provider).toBe("github");
    expect(seen.accessToken).toBe("gho_SECRET");
    expect(seen.raw.company).toBe("Analytical Engines");
  });
});

// Only a deliberate refusal reaches the visitor. Anything else (a database
// down, a bad client secret) is logged for the operator and shown generically.
describe("what the visitor sees when a login fails", () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  afterEach(() => {
    globalThis.fetch = realFetch;
    console.error = realError;
  });

  const login = async (api: any) => {
    const res = await api.get("/auth/login/github");
    const state = new URL(res.headers.get("location")).searchParams.get("state");
    const cookie = res.headers.get("set-cookie").split(";")[0];
    return api.get(`/auth/callback/github?code=c0d3&state=${state}`, {
      headers: { cookie },
    });
  };

  it("shows an onLogin refusal verbatim", async () => {
    globalThis.fetch = (async (url: any, opts: any) => {
      const one = url instanceof Request ? url.url : String(url);
      if (one.includes("access_token")) return Response.json({ access_token: "t" });
      if (one.includes("api.github.com/user")) {
        return Response.json({ id: 1, email: "a@b.c", name: "Ada" });
      }
      return realFetch(url, opts);
    }) as typeof fetch;

    const api = server({
      secrets: "s",
      auth: {
        providers: "github",
        onLogin: () => {
          throw new Error("Use your work account");
        },
        getUser: (id: string) => ({ id }),
      },
    }).test();

    const res = await login(api);
    expect(res.headers.get("location")).toContain(
      `error=${encodeURIComponent("Use your work account")}`,
    );
  });

  it("hides an internal failure behind a generic message, and logs it", async () => {
    // The token exchange itself blows up: a bad client secret, an outage
    globalThis.fetch = (async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.5:443");
    }) as unknown as typeof fetch;

    const logged: any[] = [];
    console.error = (...args: any[]) => logged.push(args.join(" "));

    const api = server({ secrets: "s", auth: "cookie:github" }).test();
    const res = await login(api);

    const location = res.headers.get("location");
    expect(location).toContain(encodeURIComponent("Could not sign you in"));
    expect(location).not.toContain("ECONNREFUSED");
    // The operator gets the real error object (its cause carries the
    // network detail); the visitor gets none of it
    expect(logged.join(" ")).toContain("github callback failed");
  });

  it("treats getUser returning nothing at login as a failure, not a login", async () => {
    globalThis.fetch = (async (url: any, opts: any) => {
      const one = url instanceof Request ? url.url : String(url);
      if (one.includes("access_token")) return Response.json({ access_token: "t" });
      if (one.includes("api.github.com/user")) {
        return Response.json({ id: 1, email: "a@b.c", name: "Ada" });
      }
      return realFetch(url, opts);
    }) as typeof fetch;
    console.error = () => {};

    const api = server({
      secrets: "s",
      auth: {
        providers: "github",
        strategy: "cookie",
        onLogin: () => "ghost",
        getUser: () => undefined,
        toPublicUser: (u: any) => u,
      },
    }).test();

    const res = await login(api);
    // A generic failure, and no session cookie: not a silent anonymous login
    expect(res.headers.get("location")).toContain(
      encodeURIComponent("Could not sign you in"),
    );
    expect(res.headers.get("set-cookie") ?? "").not.toContain("session=ey");
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
