import kv from "polystore";
import server, { ServerError } from "..";

// The auth callbacks (onProfile, onLogin, onUser, onLogout). Each fully
// replaces its built-in step; deny by throwing; every returned user must carry
// an `id` and an `email`.

// OAuth providers validate their <NAME>_ID/<NAME>_SECRET at construction
Object.assign(globalThis.env, { GOOGLE_ID: "gid", GOOGLE_SECRET: "gsecret" });

// Swap global fetch for a handler keyed on the request URL; returns a restore fn
function mockFetch(handler: (url: string, opts: any) => any) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: any, opts: any) => {
    const out = await handler(String(url), opts);
    return out instanceof Response
      ? out
      : new Response(JSON.stringify(out), {
          headers: { "content-type": "application/json" },
        });
  }) as any;
  return () => {
    globalThis.fetch = real;
  };
}

const mockGoogle = (profile: any) =>
  mockFetch((url) => {
    if (url.includes("oauth2.googleapis.com/token")) {
      return { access_token: "tok" };
    }
    if (url.includes("userinfo")) return profile;
    throw new Error(`unexpected fetch: ${url}`);
  });

const REGISTER = { email: "a@b.com", password: "password123" };

describe("onProfile", () => {
  it("replaces the built-in mapper", async () => {
    const store = kv(new Map());
    const restore = mockGoogle({ sub: "g1", email: "g@x.com", login: "gee" });
    try {
      const api = server({
        store,
        auth: {
          strategy: "cookie",
          providers: "google",
          onProfile: (raw, provider) => ({
            id: raw.sub,
            email: raw.email,
            username: raw.login,
            via: provider,
          }),
        },
      }).test();
      const res = await api.get("/auth/callback/google?code=abc&state=st", {
        headers: { cookie: "oauth_state=st" },
      });
      expect(res.status).toBe(302);

      const user = await store.get<any>("user:g1");
      expect(user.username).toBe("gee");
      expect(user.via).toBe("google");
      // The default mapper did not run on top: it would have set `name`
      expect(user).not.toHaveProperty("name");
    } finally {
      restore();
    }
  });

  it("rejects a mapped user with no id", async () => {
    const store = kv(new Map());
    const restore = mockGoogle({ sub: "g1", email: "g@x.com" });
    try {
      const api = server({
        store,
        auth: {
          strategy: "cookie",
          providers: "google",
          onProfile: (raw) => ({ email: raw.email }) as any,
        },
      }).test();
      const res = await api.get("/auth/callback/google?code=abc&state=st", {
        headers: { cookie: "oauth_state=st" },
      });
      expect(res.status).toBe(500);
      expect(await res.text()).toContain("onProfile");
      expect(await store.get("user:g1")).toBeNull(); // nothing stored
    } finally {
      restore();
    }
  });

  it("rejects a provider payload with no email through the default mapper", async () => {
    const store = kv(new Map());
    const restore = mockGoogle({ sub: "g1", name: "NoMail" });
    try {
      const api = server({ store, auth: "cookie:google" }).test();
      const res = await api.get("/auth/callback/google?code=abc&state=st", {
        headers: { cookie: "oauth_state=st" },
      });
      expect(res.status).toBe(500);
    } finally {
      restore();
    }
  });
});

describe("onLogin", () => {
  it("receives null on a first login and the stored user afterwards", async () => {
    const seen: any[] = [];
    const store = kv(new Map());
    const api = server({
      store,
      secret: "s3cret-s3cret",
      auth: {
        strategy: "token",
        providers: "email",
        onLogin: (loginUser, existingUser) => {
          seen.push(existingUser);
          return { ...(existingUser ?? {}), ...loginUser };
        },
      },
    }).test();

    await api.post("/auth/register/email", REGISTER);
    expect(seen[0]).toBeNull();

    await api.post("/auth/login/email", REGISTER);
    expect(seen[1]).not.toBeNull();
    expect(seen[1].email).toBe("a@b.com");
  });

  it("owns the stored record", async () => {
    const store = kv(new Map());
    const api = server({
      store,
      secret: "s3cret-s3cret",
      auth: {
        strategy: "token",
        providers: "email",
        onLogin: (loginUser, existingUser) => ({
          ...loginUser,
          role: existingUser ? existingUser.role : "member",
        }),
      },
    }).test();

    await api.post("/auth/register/email", REGISTER);
    expect((await store.get<any>("user:a@b.com")).role).toBe("member");
  });

  it("denies by throwing, storing nothing", async () => {
    const store = kv(new Map());
    const api = server({
      store,
      secret: "s3cret-s3cret",
      auth: {
        strategy: "token",
        providers: "email",
        onLogin: (loginUser) => {
          if (!loginUser.email.endsWith("@company.com")) {
            throw new ServerError("NOT_ALLOWED", 403, "Company accounts only");
          }
          return loginUser;
        },
      },
    }).test();

    const res = await api.post("/auth/register/email", REGISTER);
    expect(res.status).toBe(403);
    // A denied first registration leaves no account behind
    expect(await store.get("user:a@b.com")).toBeNull();
  });

  it("rejects a non-object return instead of storing it", async () => {
    const store = kv(new Map());
    const api = server({
      store,
      secret: "s3cret-s3cret",
      auth: {
        strategy: "token",
        providers: "email",
        // The mistake this guards: returning a status instead of throwing
        onLogin: (() => 401) as any,
      },
    }).test();

    const res = await api.post("/auth/register/email", REGISTER);
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("onLogin");
    expect(await store.get("user:a@b.com")).toBeNull();
  });
});

describe("onUser", () => {
  const app = (onUser?: any) =>
    server({
      store: kv(new Map()),
      secret: "s3cret-s3cret",
      auth: { strategy: "token", providers: "email", onUser },
    })
      .get("/me", (ctx) => ctx.user || 401)
      .test();

  const login = async (api: any) => {
    const res = await api.post("/auth/register/email", REGISTER);
    return (await res.json()).token;
  };

  it("strips the password by default, at login and on ctx.user", async () => {
    const api = app();
    const res = await api.post("/auth/register/email", REGISTER);
    const body = await res.json();
    expect(body).not.toHaveProperty("password");

    const me = await api.get("/me", {
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(await me.json()).not.toHaveProperty("password");
  });

  it("replaces the default and may enrich from a store", async () => {
    const api = app(async (user: any, ctx: any) => {
      const { password, ...rest } = user;
      return { ...rest, role: await Promise.resolve("admin"), path: ctx.url.pathname };
    });
    const token = await login(api);
    const me = await api.get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await me.json();
    expect(body.role).toBe("admin");
    expect(body.path).toBe("/me"); // ctx is the live request context
  });

  it("cannot strip the email", async () => {
    const api = app(({ email, password, ...user }: any) => user);
    const res = await api.post("/auth/register/email", REGISTER);
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("onUser");
  });
});

describe("onLogout", () => {
  it("fires on POST /auth/logout with ctx.user still set", async () => {
    let logged: any;
    const api = server({
      store: kv(new Map()),
      secret: "s3cret-s3cret",
      auth: {
        strategy: "token",
        providers: "email",
        onLogout: (ctx: any) => {
          logged = ctx.user?.email;
        },
      },
    }).test();

    const reg = await api.post("/auth/register/email", REGISTER);
    const { token } = await reg.json();
    const res = await api.post("/auth/logout", null, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(logged).toBe("a@b.com");
  });
});
