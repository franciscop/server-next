import kv from "polystore";
import server, { bucket } from ".";

const CREDENTIALS = { email: "abc@test.com", password: "11111111" };

// `auth.sessions` accepts anything polystore does, so the simple case needs no
// wrapping and the explicit one keeps working.
describe("sessions sources", () => {
  const login = (sessions: any) =>
    server({
      auth: {
        strategy: "token",
        providers: ["email"],
        users: new Map(),
        sessions,
      },
    })
      .get("/me", (ctx) => ctx.user || 401)
      .test();

  // Logs in, then reads the user back through the stored record
  const roundtrip = async (api: any) => {
    const { token } = await (
      await api.post("/auth/register/email", CREDENTIALS)
    ).json();
    const me = await api.get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    return (await me.json()).email;
  };

  it("takes a plain Map", async () => {
    expect(await roundtrip(login(new Map()))).toBe(CREDENTIALS.email);
  });

  it("takes an already-wrapped store", async () => {
    expect(await roundtrip(login(kv(new Map())))).toBe(CREDENTIALS.email);
  });

  it("keeps the prefix of a store it was given", async () => {
    // Re-wrapping a store unwraps it to its raw adapter, losing the prefix, so
    // an already-built store has to be used as-is
    const map = new Map();
    await login(kv(map).prefix("session:")).post(
      "/auth/register/email",
      CREDENTIALS,
    );
    expect(map.size).toBeGreaterThan(0);
    expect([...map.keys()].every((k) => k.startsWith("session:"))).toBe(true);
  });

  it("keeps the expiry of a store it was given", async () => {
    const store = kv(new Map(), { expires: "1h" });
    await login(store).post("/auth/register/email", CREDENTIALS);
    expect((store as any).EXPIRES).toBe(3600);
  });

  it("takes a store whose adapter is still connecting", async () => {
    // A store built from a pending source, like a client still connecting
    const map = new Map();
    const pending = kv(new Promise((r) => setTimeout(() => r(map), 10)));
    expect(await roundtrip(login(pending))).toBe(CREDENTIALS.email);
  });

  it("writes the login into the Map it was given", async () => {
    const map = new Map();
    await login(map).post("/auth/register/email", CREDENTIALS);
    expect(map.size).toBe(1);
  });

  it("defaults to an in-memory store in development", async () => {
    const api = server({
      auth: { strategy: "token", providers: ["email"], users: new Map() },
    })
      .get("/me", (ctx) => ctx.user || 401)
      .test();
    expect(await roundtrip(api)).toBe(CREDENTIALS.email);
  });
});

describe("re-exported libraries", () => {
  it("exports kv(), which builds a working store", async () => {
    const store = kv(new Map());
    await store.set("a", 1);
    expect(await store.get("a")).toBe(1);
  });

  it("exports the bucket providers", () => {
    expect(typeof bucket.FS).toBe("function");
    expect(typeof bucket.S3).toBe("function");
  });
});
