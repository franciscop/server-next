import kv from "polystore";
import server from "..";

describe("jwt auth flow", () => {
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const store = kv(new Map());
  const sessions = () => store.prefix("auth:").keys();
  const users = () => store.prefix("user:").keys();
  const api = server({ secret: "app-secret", store, auth: "jwt:email" })
    .get("/me", (ctx) => ctx.user || "No data")
    .test();

  it("issues a stateless JWT and authenticates with it", async () => {
    // Register -> a signed JWT, and NO server-side session is stored.
    const register = await api.post("/auth/register/email", CREDENTIALS);
    expect(register.status).toBe(201);
    const { token } = await register.json();
    expect(token.split(".")).toHaveLength(3); // it's a JWT, not a 16-char id
    expect(await users()).toEqual([EMAIL]);
    expect(await sessions()).toEqual([]); // stateless: nothing in the session store

    // Authenticate with the Bearer JWT.
    const auth = { authorization: `Bearer ${token}` };
    const me = await api.get("/me", { headers: auth });
    expect(me.status).toBe(200);
    expect((await me.json()).email).toBe(EMAIL);

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
    expect(await sessions()).toEqual([]);
  });

  it("warns when jwt is configured with no secret", () => {
    const original = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);
    try {
      // No secret + jwt -> the per-process `unsafe-` secret would break tokens.
      server({ store: kv(new Map()), auth: "jwt:email" });
      expect(warnings.some((w) => w.includes("SECRET"))).toBe(true);

      // A set secret -> no warning.
      warnings.length = 0;
      server({ secret: "stable", store: kv(new Map()), auth: "jwt:email" });
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
});
