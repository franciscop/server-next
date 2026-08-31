import server from "..";

// The login flow we run ourselves: the four strategies, the callbacks, and
// what each of them stores. See docs/5. Authentication.md.
describe("a login flow with your database", () => {
  const rows = new Map<string, any>();
  const sessions = new Map<string, string>();

  const base = {
    providers: "github",
    onLogin: (profile: any) => {
      rows.set(profile.id, { id: profile.id, email: profile.email, role: "user" });
      return profile.id;
    },
    getUser: (id: string) => rows.get(id),
  };

  beforeEach(() => {
    rows.clear();
    sessions.clear();
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  it("mounts login, callback and logout", async () => {
    const api = server({ secrets: "s", auth: base }).test();
    expect((await api.get("/auth/login/github")).status).toBe(302);
    // No code and no state: it is mounted, and it refuses the request
    expect((await api.get("/auth/callback/github")).status).toBe(403);
    expect((await api.post("/auth/logout")).status).toBe(302);
  });

  it("redirects a browser, and hands a script the URL", async () => {
    const api = server({ secrets: "s", auth: base }).test();

    const redirect = await api.get("/auth/login/github");
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toContain("github.com");

    // The caller decides the shape, not the strategy: same app, same route
    const json = await api.get("/auth/login/github", {
      headers: { accept: "application/json" },
    });
    expect(json.status).toBe(200);
    expect((await json.json()).url).toContain("github.com");
  });

  it("carries the CSRF state on the JSON answer too", async () => {
    // A same-origin fetch stores the cookie, so a SPA on a cookie strategy
    // can take the URL, navigate, and still pass the callback's state check
    const api = server({ secrets: "s", auth: base }).test();
    const res = await api.get("/auth/login/github", {
      headers: { accept: "application/json" },
    });
    const { url } = await res.json();
    expect(url).toContain("state=");
    expect(res.headers.get("set-cookie")).toContain("oauth_state=");
  });

  it("refuses a strategy it does not know at boot", () => {
    expect(() =>
      server({ secrets: "s", auth: { ...base, strategy: "cook" as any } }),
    ).toThrow(/cook/);
  });

  it("refuses a provider it does not know, naming it", () => {
    expect(() => server({ auth: { ...base, providers: "nope" } })).toThrow(/nope/);
  });

  it("needs an issuer for a provider it does not ship", () => {
    expect(() => server({ auth: { ...base, providers: { work: {} } } })).toThrow(
      /issuer/i,
    );
  });

  it("requires getUser with onLogin", () => {
    expect(() =>
      server({ auth: { providers: "github", onLogin: () => "1" } as any }),
    ).toThrow(/getUser/);
  });

  it("requires toPublicUser for the signed strategies", () => {
    expect(() =>
      server({ secrets: "s", auth: { ...base, strategy: "cookie" } }),
    ).toThrow(/toPublicUser/);
  });

  it("takes no callbacks at all, and then signs the profile", () => {
    expect(() => server({ secrets: "s", auth: "cookie:github" })).not.toThrow();
    // ...but `session` has nowhere to look an id up
    expect(() => server({ secrets: "s", auth: "session:github" })).toThrow(
      /getUser|database/i,
    );
  });
});

describe("providers", () => {
  it("takes a name, with no endpoints or issuer to look up", async () => {
    env.GOOGLE_ID = "id";
    env.GOOGLE_SECRET = "secret";
    const api = server({
      secrets: "s",
      auth: { providers: "google", onLogin: (p) => p.id, getUser: (id) => ({ id }) },
    }).test();

    const res = await api.get("/auth/login/google");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("accounts.google.com");
  });

  it("refuses a provider with no client id at boot, not at login", () => {
    delete env.DISCORD_ID;
    expect(() =>
      server({
        secrets: "s",
        auth: { providers: "discord", onLogin: (p) => p.id, getUser: (id) => ({ id }) },
      }),
    ).toThrow(/DISCORD_ID/);
  });

  it("takes an issuer URL for anything it does not ship", () => {
    expect(() =>
      server({
        secrets: "s",
        auth: { providers: "acme", onLogin: (p) => p.id, getUser: (id) => ({ id }) },
      }),
    ).toThrow(/issuer/);
  });
});

// The callback is a browser navigation under every strategy, so it always
// needs binding to the browser that started the login. Without it, someone
// can be walked through a callback carrying an attacker's code and end up
// signed in as the attacker.
describe("login CSRF", () => {
  const stateless = {
    providers: "github",
    strategy: "jwt" as const,
    onLogin: (p: any) => p.id,
    getUser: (id: string) => ({ id }),
    toPublicUser: (u: any) => u,
  };

  it("refuses a callback with no state, on a client-held credential", async () => {
    const api = server({ secrets: "s", auth: stateless }).test();
    const res = await api.get("/auth/callback/github?code=attacker-code");
    expect(res.status).toBe(403);
  });

  it("refuses a callback whose state does not match the browser's", async () => {
    const api = server({ secrets: "s", auth: stateless }).test();
    const res = await api.get("/auth/callback/github?code=c&state=guessed", {
      headers: { cookie: "oauth_state=the-real-one" },
    });
    expect(res.status).toBe(403);
  });

  it("issues the state on the JSON answer, so a same-origin client binds too", async () => {
    const api = server({ secrets: "s", auth: stateless }).test();
    const res = await api.get("/auth/login/github", {
      headers: { accept: "application/json" },
    });
    const { url } = await res.json();
    const state = new URL(url).searchParams.get("state");

    // The cookie is signed, and carries the state plus anything that must not
    // travel in the URL (a PKCE verifier)
    const cookie = res.headers.get("set-cookie")!;
    const token = cookie.split("oauth_state=")[1].split(";")[0];
    const pending = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    expect(pending.state).toBe(state);
  });
});

// PKCE providers keep a `code_verifier` that must never travel in the URL, so
// it rides in the signed state cookie instead of a store.
describe("PKCE providers", () => {
  it("puts the challenge in the URL and the verifier in the cookie", async () => {
    env.TWITTER_ID = "id";
    env.TWITTER_SECRET = "secret";
    const api = server({
      secrets: "s",
      auth: { providers: "twitter", onLogin: (p) => p.id, getUser: (id) => ({ id }) },
    }).test();

    const res = await api.get("/auth/login/twitter");
    const url = new URL(res.headers.get("location")!);
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");

    const token = res.headers
      .get("set-cookie")!
      .split("oauth_state=")[1]
      .split(";")[0];
    const pending = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    expect(pending.payload.codeVerifier).toBeTruthy();
    // The verifier is the secret half: it must not be in the URL
    expect(res.headers.get("location")).not.toContain(pending.payload.codeVerifier);
  });
});

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

// Config mistakes fail at boot, where the operator sees them, rather than
// per-login in the visitor's face.
describe("boot-time validation", () => {
  const base = {
    providers: "github",
    onLogin: (p: any) => p.id,
    getUser: (id: string) => ({ id }),
  };
  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  it("takes any duration the cookie parser takes", () => {
    expect(() => server({ secrets: "s", auth: { ...base, expires: "1y" } })).not.toThrow();
    expect(() => server({ secrets: "s", auth: { ...base, expires: "12 hours" } })).not.toThrow();
  });

  it("refuses a duration it cannot parse", () => {
    expect(() => server({ secrets: "s", auth: { ...base, expires: "1 parsec" } })).toThrow(
      /expires/,
    );
  });

  it("refuses to boot in production with no stable secret", () => {
    const env2 = globalThis.env as Record<string, string | undefined>;
    env2.NODE_ENV = "production";
    try {
      expect(() => server({ auth: base })).toThrow(/SECRETS/);
      // With one set, it boots
      expect(() => server({ secrets: "s", auth: base })).not.toThrow();
    } finally {
      delete env2.NODE_ENV;
    }
  });
});
