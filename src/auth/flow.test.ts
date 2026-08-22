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
