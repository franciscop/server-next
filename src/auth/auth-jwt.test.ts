import kv from "polystore";
import server from "..";

describe("jwt auth flow", () => {
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const userStore = kv(new Map());
  const users = () => userStore.keys();
  const app = server({
    secrets: "app-secret",
    auth: { strategy: "jwt", providers: ["email"], users: userStore },
  }).get("/me", (ctx) => ctx.user || "No data");
  const api = app.test();

  it("issues a stateless JWT and authenticates with it", async () => {
    // Register -> a signed JWT, and NO server-side session is stored.
    const register = await api.post("/auth/register/email", CREDENTIALS);
    expect(register.status).toBe(201);
    const { token } = await register.json();
    expect(token.split(".")).toHaveLength(3); // it's a JWT, not a 16-char id
    expect(await users()).toEqual([EMAIL]);
    // Stateless: the strategy configures no session store at all
    expect(app.settings.auth.sessions).toBeNull();

    // The payload IS the user (onToken-shaped): claims in, password out
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    expect(payload.email).toBe(EMAIL);
    expect(payload.provider).toBe("email");
    expect(payload.password).toBeUndefined();

    // Authenticate with the Bearer JWT.
    const auth = { authorization: `Bearer ${token}` };
    const me = await api.get("/me", { headers: auth });
    expect(me.status).toBe(200);
    expect((await me.json()).email).toBe(EMAIL);

    // Truly stateless: the user resolves even with the users store wiped
    await userStore.clear();
    const still = await api.get("/me", { headers: auth });
    expect(still.status).toBe(200);
    expect((await still.json()).email).toBe(EMAIL);
    await api.post("/auth/register/email", CREDENTIALS); // restore for later tests

    // No token -> anonymous.
    const anon = await api.get("/me");
    expect(await anon.text()).toBe("No data");

    // A tampered token is rejected.
    const bad = await api.get("/me", {
      headers: { authorization: `Bearer ${token}tampered` },
    });
    expect(bad.status).toBe(401);

    // Logout is a no-op server-side (stateless); the client discards the token.
    const logout = await api.post("/auth/logout", {}, { headers: auth });
    expect(logout.status).toBe(200);
  });

  it("warns when jwt is configured with no secret", () => {
    const original = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);
    try {
      // No secret + jwt -> the per-process `unsafe-` secret would break tokens.
      server({ auth: "jwt:email" });
      expect(warnings.some((w) => w.includes("SECRET"))).toBe(true);

      // A set secret -> no warning.
      warnings.length = 0;
      server({ secrets: "stable", auth: "jwt:email" });
      expect(warnings.some((w) => w.includes("SECRET"))).toBe(false);
    } finally {
      console.warn = original;
    }
  });

  it("logs in and validates the password", async () => {
    const login = await api.post("/auth/login/email", CREDENTIALS);
    expect(login.status).toBe(201);
    const { token } = await login.json();
    const me = await api.get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect((await me.json()).email).toBe(EMAIL);

    const wrong = await api.post("/auth/login/email", {
      ...CREDENTIALS,
      password: "99999999",
    });
    expect(wrong.status).toBe(500);
  });

  it("onToken trims what the token carries", async () => {
    const app = server({
      secrets: "app-secret",
      auth: {
        strategy: "jwt",
        providers: ["email"],
        onToken: ({ id, email }: any) => ({ id, email }),
      },
    })
      .get("/me", (ctx) => ctx.user || "No data")
      .test();

    const reg = await app.post("/auth/register/email", {
      ...CREDENTIALS,
      nickname: "abc",
    });
    const { token } = await reg.json();
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    expect(payload.nickname).toBeUndefined(); // trimmed by onToken
    expect(payload.email).toBe(EMAIL);
    expect(payload.provider).toBe("email"); // re-stamped after the hook

    const me = await app.get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect((await me.json()).nickname).toBeUndefined();
  });

  it("onUser extends ctx.user per request, without touching the token", async () => {
    const app = server({
      secrets: "app-secret",
      auth: {
        strategy: "jwt",
        providers: ["email"],
        onUser: ({ password, ...user }: any) => ({ ...user, role: "admin" }),
      },
    })
      .get("/me", (ctx) => ctx.user || "No data")
      .test();

    const reg = await app.post("/auth/register/email", CREDENTIALS);
    const { token, role } = await reg.json();
    expect(role).toBe("admin"); // the login body matches next-request ctx.user
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    expect(payload.role).toBeUndefined(); // enrichment never enters the token

    const me = await app.get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect((await me.json()).role).toBe("admin");
  });

  it("rejects tokens whose claims carry no id/email with a 401", async () => {
    const { signJwt } = await import("../helpers/jwt");
    // An old-shape (pre-claims) payload: a pointer, not a user
    const legacy = await signJwt(
      { user: EMAIL, provider: "email", created: "2024-01-01" },
      "app-secret",
      3600,
    );
    const res = await api.get("/me", {
      headers: { authorization: `Bearer ${legacy}` },
    });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Invalid Authorization token");
  });

  it("is cookie-free: nothing is stored or minted", async () => {
    const app = server({ secrets: "app-secret", auth: "jwt:email" })
      .get("/ok", () => "stateless")
      .test();

    const ok = await app.get("/ok");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toBeNull();
  });
});
