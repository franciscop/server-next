import server from "..";

// Every shape of `auth` ends in a plain `ctx.user`.
// See docs/5. Authentication.md.
describe("the shapes of `auth`", () => {
  const me = (app: any, opts?: any) => app.test().get("/me", opts);

  it("a function: request in, user out", async () => {
    const app = server({
      auth: (ctx: any) =>
        ctx.headers["x-api-key"] === "k" ? { id: "1", email: "a@b.c" } : undefined,
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

    expect(await (await me(app, { headers: { "x-api-key": "k" } })).json()).toMatchObject({
      email: "a@b.c",
    });
    expect(await (await me(app)).text()).toBe("anonymous");
  });

  it("a function runs once per request, even when read twice", async () => {
    let calls = 0;
    const app = server({
      auth: () => {
        calls++;
        return { id: "1" };
      },
    }).get("/me", (ctx) => `${ctx.user?.id}${ctx.user?.id}`);

    await me(app);
    expect(calls).toBe(1);
  });

  it("does not resolve a user when no auth is configured", async () => {
    const app = server().get("/me", (ctx) => ctx.user ?? "anonymous");
    expect(await (await me(app)).text()).toBe("anonymous");
  });

  it("an array: first to answer wins", async () => {
    const app = server({
      auth: [
        (ctx: any) => (ctx.headers["x-a"] ? { id: "a" } : undefined),
        (ctx: any) => (ctx.headers["x-b"] ? { id: "b" } : undefined),
      ],
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

    expect(await (await me(app, { headers: { "x-b": "1" } })).json()).toMatchObject({ id: "b" });
    expect(
      await (await me(app, { headers: { "x-a": "1", "x-b": "1" } })).json(),
    ).toMatchObject({ id: "a" });
    expect(await (await me(app)).text()).toBe("anonymous");
  });

  it("a library instance: its routes are mounted at its own path", async () => {
    const app = server({
      auth: {
        path: "/api/auth",
        handler: (request: Request) =>
          new Response(`handled ${new URL(request.url).pathname}`),
        user: () => ({ id: "1" }),
      },
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

    const res = await app.test().get("/api/auth/sign-in/social");
    expect(await res.text()).toBe("handled /api/auth/sign-in/social");
  });

  it("refuses an unknown shape at boot rather than ignoring it", () => {
    expect(() => server({ auth: 42 as any })).toThrow(/auth/i);
  });
});

describe("a library instance gets the exact bytes", () => {
  it("streams the body through unparsed", async () => {
    let seen: string | undefined;
    const app = server({
      auth: {
        handler: async (request: Request) => {
          seen = await request.text();
          return new Response("ok");
        },
        user: () => undefined,
      },
    });

    await app.test().post("/api/auth/sign-in/email", { email: "a@b.c" });
    // Byte-for-byte, not re-serialised from a parsed object
    expect(seen).toBe('{"email":"a@b.c"}');
  });
});

// A vendor runs the login itself, so `<carrier>:<vendor>` only says where their
// token rides. See docs/5. Authentication.md.
describe("verifying a vendor's token by name", () => {
  const env = globalThis.env as Record<string, string | undefined>;

  afterEach(() => {
    delete env.CLERK_ISSUER;
    delete env.CLERK_AUDIENCE;
    delete env.SUPABASE_ISSUER;
    delete env.SUPABASE_AUDIENCE;
  });

  it("reads the issuer and audience from the environment", () => {
    env.CLERK_ISSUER = "https://touched-donkey-12.clerk.accounts.dev";
    env.CLERK_AUDIENCE = "my-api";
    const app = server({ auth: "jwt:clerk" });
    expect(app.settings.auth[0].name).toBe(
      "verify:https://touched-donkey-12.clerk.accounts.dev",
    );
  });

  it("mounts no routes of ours: the vendor owns the login", async () => {
    env.SUPABASE_ISSUER = "https://xyz.supabase.co/auth/v1";
    env.SUPABASE_AUDIENCE = "authenticated";
    const api = server({ auth: "jwt:supabase" }).test();
    expect((await api.get("/auth/login/supabase")).status).toBe(404);
  });

  it("names the missing environment variable", () => {
    expect(() => server({ auth: "jwt:clerk" })).toThrow(/CLERK_ISSUER/);
    env.CLERK_ISSUER = "https://x.clerk.accounts.dev";
    expect(() => server({ auth: "jwt:clerk" })).toThrow(/CLERK_AUDIENCE/);
  });

  it("refuses the carriers that need something of ours to look up", () => {
    env.CLERK_ISSUER = "https://x.clerk.accounts.dev";
    env.CLERK_AUDIENCE = "my-api";
    expect(() => server({ auth: "session:clerk" })).toThrow(/jwt:clerk/);
    expect(() => server({ auth: "token:clerk" })).toThrow(/jwt:clerk/);
  });

  it("refuses a cookie carrier when the vendor has no standard cookie", () => {
    env.SUPABASE_ISSUER = "https://xyz.supabase.co/auth/v1";
    env.SUPABASE_AUDIENCE = "authenticated";
    expect(() => server({ auth: "cookie:supabase" })).toThrow(/cookie/i);
  });
});

// A name means one thing. Auth0, Cognito and Keycloak are providers you can
// log in with, so they are not also vendor shorthands.
describe("provider and vendor names do not collide", () => {
  it("treats a login provider's name as a login", async () => {
    env.AUTH0_ID = "id";
    env.AUTH0_SECRET = "secret";
    const api = server({
      secrets: "s",
      auth: {
        // Tenant-specific providers take their own option alongside the
        // credentials, passed straight through
        providers: { auth0: { domain: "acme.auth0.com" } },
        onLogin: (p: any) => p.id,
        getUser: (id: string) => ({ id }),
      },
    }).test();
    // Mounted, so it is a login flow rather than a token check
    expect((await api.get("/auth/login/auth0")).status).toBe(302);
  });

  it("keeps the vendor shorthand for the ones that are not providers", () => {
    const env2 = globalThis.env as Record<string, string | undefined>;
    env2.CLERK_ISSUER = "https://x.clerk.accounts.dev";
    env2.CLERK_AUDIENCE = "https://app.example.com";
    try {
      const app = server({ auth: "jwt:clerk" });
      expect(app.settings.auth[0].name).toContain("verify:");
    } finally {
      delete env2.CLERK_ISSUER;
      delete env2.CLERK_AUDIENCE;
    }
  });
});

// The name you type drives the environment variables, so an alias must not
// borrow the canonical provider's.
describe("provider aliases", () => {
  it("reads credentials from the name you used", async () => {
    const env2 = globalThis.env as Record<string, string | undefined>;
    env2.ENTRA_ID = "mine";
    env2.ENTRA_SECRET = "secret";
    try {
      const api = server({
        secrets: "s",
        auth: {
          providers: { entra: { tenant: "common" } },
          onLogin: (p: any) => p.id,
          getUser: (id: string) => ({ id }),
        },
      }).test();
      const res = await api.get("/auth/login/entra");
      expect(res.headers.get("location")).toContain("client_id=mine");
    } finally {
      delete env2.ENTRA_ID;
      delete env2.ENTRA_SECRET;
    }
  });
});

// `cognito` and `microsoft` are the names people write, so those are the
// variables they set. The long spellings must not shadow them.
describe("the friendly names own their environment", () => {
  const env2 = globalThis.env as Record<string, string | undefined>;
  afterEach(() => {
    for (const k of ["COGNITO_ID", "COGNITO_SECRET", "COGNITO_DOMAIN"]) {
      delete env2[k];
    }
  });

  it("cognito reads COGNITO_ID, never AMAZONCOGNITO_ID", async () => {
    env2.COGNITO_ID = "mine";
    env2.COGNITO_SECRET = "secret";
    const api = server({
      secrets: "s",
      auth: {
        providers: { cognito: { domain: "acme.auth.eu-west-1.amazoncognito.com" } },
        onLogin: (p: any) => p.id,
        getUser: (id: string) => ({ id }),
      },
    }).test();

    const res = await api.get("/auth/login/cognito");
    expect(res.headers.get("location")).toContain("client_id=mine");
    // ...and the route is named after what you typed
    expect(res.status).toBe(302);
  });
});

// Firebase and Google Cloud Identity Platform are the same tokens: the client
// SDK signs people in, the server only checks what arrives.
describe("firebase", () => {
  const env2 = globalThis.env as Record<string, string | undefined>;
  afterEach(() => {
    delete env2.FIREBASE_ISSUER;
    delete env2.FIREBASE_AUDIENCE;
    delete env2.GCIP_ISSUER;
    delete env2.GCIP_AUDIENCE;
  });

  it("verifies against the project's issuer", () => {
    env2.FIREBASE_ISSUER = "https://securetoken.google.com/my-project";
    env2.FIREBASE_AUDIENCE = "my-project";
    const app = server({ auth: "jwt:firebase" });
    expect(app.settings.auth[0].name).toBe(
      "verify:https://securetoken.google.com/my-project",
    );
  });

  it("names the missing variable, since the project id cannot be guessed", () => {
    expect(() => server({ auth: "jwt:firebase" })).toThrow(/FIREBASE_ISSUER/);
  });

  it("has no cookie: the SDK keeps the token, so it arrives as a header", () => {
    env2.FIREBASE_ISSUER = "https://securetoken.google.com/my-project";
    env2.FIREBASE_AUDIENCE = "my-project";
    expect(() => server({ auth: "cookie:firebase" })).toThrow(/cookie/i);
  });

  it("gcip is the same service under its enterprise name", () => {
    env2.GCIP_ISSUER = "https://securetoken.google.com/my-project";
    env2.GCIP_AUDIENCE = "my-project";
    const app = server({ auth: "jwt:gcip" });
    expect(app.settings.auth[0].name).toContain("securetoken.google.com");
  });
});
