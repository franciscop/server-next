import kv from "polystore";
import server, { bucket } from ".";

// `sessions` accepts anything polystore does, so the simple case needs no
// wrapping and the explicit one keeps working.
describe("sessions sources", () => {
  const counter = (sessions: any) =>
    server({ sessions })
      .post("/hit", (ctx) => {
        ctx.session.n = Number(ctx.session.n || 0) + 1;
        return { n: ctx.session.n };
      })
      .test();

  const hit = async (api: any) => {
    const first = await api.post("/hit");
    const cookie = String(first.headers.get("set-cookie")).split(";")[0];
    const second = await api.post("/hit", null, { headers: { cookie } });
    return (await second.json()).n;
  };

  it("takes a plain Map", async () => {
    expect(await hit(counter(new Map()))).toBe(2);
  });

  it("takes an already-wrapped store", async () => {
    expect(await hit(counter(kv(new Map())))).toBe(2);
  });

  it("keeps the prefix of a store it was given", async () => {
    // Re-wrapping a store unwraps it to its raw adapter, losing the prefix, so
    // an already-built store has to be used as-is
    const map = new Map();
    await counter(kv(map).prefix("session:")).post("/hit");
    expect(map.size).toBeGreaterThan(0);
    expect([...map.keys()].every((k) => k.startsWith("session:"))).toBe(true);
  });

  it("keeps the expiry of a store it was given", async () => {
    const store = kv(new Map(), { expires: "1h" });
    const api = server({ sessions: store })
      .post("/hit", (ctx) => {
        ctx.session.n = 1;
        return 201;
      })
      .test();
    await api.post("/hit");
    expect((store as any).EXPIRES).toBe(3600);
  });

  it("takes a store whose adapter is still connecting", async () => {
    // A store built from a pending source, like a client still connecting
    const map = new Map();
    const pending = kv(new Promise((r) => setTimeout(() => r(map), 10)));
    expect(await hit(counter(pending))).toBe(2);
  });

  it("writes sessions into the Map it was given", async () => {
    const map = new Map();
    await counter(map).post("/hit");
    expect(map.size).toBe(1);
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
