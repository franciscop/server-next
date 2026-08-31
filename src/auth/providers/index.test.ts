import server from "../..";

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
