import server from "..";

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
    expect(app.settings.auth.name).toBe(
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
      expect(app.settings.auth.name).toContain("verify:");
    } finally {
      delete env2.CLERK_ISSUER;
      delete env2.CLERK_AUDIENCE;
    }
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
    expect(app.settings.auth.name).toBe(
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
    expect(app.settings.auth.name).toContain("securetoken.google.com");
  });
});
