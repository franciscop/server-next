import server from "../..";

// An alias is a shorter name for the same provider: it mounts under the name
// you typed, and its credentials are the provider's own variables.
describe("provider aliases", () => {
  const vars = [
    "MICROSOFT_ENTRA_ID_CLIENT_ID",
    "MICROSOFT_ENTRA_ID_CLIENT_SECRET",
    "AMAZON_COGNITO_CLIENT_ID",
    "AMAZON_COGNITO_CLIENT_SECRET",
  ];
  afterEach(() => {
    for (const k of vars) delete process.env[k];
  });

  const login = (providers: Record<string, any>) =>
    server({
      secrets: "s",
      auth: {
        providers,
        onLogin: (p: any) => p.id,
        getUser: (id: string) => ({ id }),
      },
    }).test();

  it("entra and microsoft read the Entra ID variables", async () => {
    process.env.MICROSOFT_ENTRA_ID_CLIENT_ID = "mine";
    process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET = "secret";
    for (const name of ["entra", "microsoft"]) {
      const res = await login({ [name]: { tenant: "common" } }).get(
        `/auth/login/${name}`,
      );
      expect(res.headers.get("location")).toContain("client_id=mine");
    }
  });

  it("cognito reads the Amazon Cognito variables, under its own route", async () => {
    process.env.AMAZON_COGNITO_CLIENT_ID = "mine";
    process.env.AMAZON_COGNITO_CLIENT_SECRET = "secret";
    const res = await login({
      cognito: { domain: "acme.auth.eu-west-1.amazoncognito.com" },
    }).get("/auth/login/cognito");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("client_id=mine");
  });
});

describe("renamed credentials", () => {
  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID;
    delete (globalThis.env as any).GITHUB_ID;
  });

  const boot = (providers: any) => () =>
    server({
      secrets: "s",
      auth: {
        providers,
        onLogin: (p: any) => p.id,
        getUser: (id: string) => ({ id }),
      },
    });

  // Set under the old name, the message says what it is called now
  it("names the variable to rename when only the old one is set", () => {
    delete process.env.GITHUB_CLIENT_ID;
    (globalThis.env as any).GITHUB_ID = "old";
    expect(boot("github")).toThrow(
      /GITHUB_CLIENT_ID.*GITHUB_ID and GITHUB_SECRET are no longer read/,
    );
  });

  it("refuses the old option names instead of passing them through", () => {
    expect(boot({ github: { id: "x" } })).toThrow(/`id` is now `clientId`/);
    expect(boot({ github: { scope: "repo" } })).toThrow(
      /`scope` is now `scopes`/,
    );
  });

  it("takes explicit credentials under the new option names", () => {
    expect(
      boot({ github: { clientId: "x", clientSecret: "y" } }),
    ).not.toThrow();
  });
});
