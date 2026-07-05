import kv from "polystore";
import server from ".";

describe("session", () => {
  const store = kv(new Map());
  const api = server({ store })
    .get("/hello", async (ctx) => {
      return `Hello ${ctx.session.a}`;
    })
    .post("/hello", async (ctx) => {
      if (!ctx.session.a) ctx.session.a = 0;
      ctx.session.a = Number(ctx.session.a) + 1;
      return `Bye ${ctx.session.a}`;
    })
    .get("/", () => "Fallback")
    .test();

  it("can get the nested get", async () => {
    const cookie = "session=REqA2l022l8Q0tuIRtqLOPUy";
    const options = { headers: { cookie } };

    await store.set("session:REqA2l022l8Q0tuIRtqLOPUy", { a: 0 });

    const res = await api.get("/hello", options);
    expect(await res.text()).toBe("Hello 0");

    const res2 = await api.post("/hello", {}, options);
    expect(await res2.text()).toBe("Bye 1");

    const res3 = await api.get("/hello", options);
    expect(await res3.text()).toBe("Hello 1");
    expect(await store.get("session:REqA2l022l8Q0tuIRtqLOPUy")).toEqual({
      a: 1,
    });

    const res4 = await api.post("/hello", {}, options);
    expect(await res4.text()).toBe("Bye 2");

    const res5 = await api.get("/hello", options);
    expect(await res5.text()).toBe("Hello 2");
    expect(await store.get("session:REqA2l022l8Q0tuIRtqLOPUy")).toEqual({
      a: 2,
    });
  });
});

describe("new session (no incoming cookie)", () => {
  // Regression for the bug where a freshly-issued session is stored under the
  // OLD cookie id (undefined) instead of the new id sent in Set-Cookie, so it
  // can never be read back. Expected to FAIL until parseResponse is fixed.
  const store = kv(new Map());
  const api = server({ store })
    .post("/inc", (ctx) => {
      ctx.session.count = Number(ctx.session.count || 0) + 1;
      return { count: ctx.session.count };
    })
    .get("/count", (ctx) => ({ count: ctx.session.count ?? null }))
    .test();

  it("persists the session under the cookie it issued", async () => {
    // First request: no cookie -> the server issues a session cookie
    const res = await api.post("/inc", {});
    expect(await res.json()).toEqual({ count: 1 });

    const setCookie = res.headers.get("set-cookie") || "";
    const id = setCookie.match(/session=([^;]+)/)?.[1];
    expect(id).toBeTruthy();
    // The session cookie is hardened (HttpOnly + SameSite; Secure in prod).
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    // Second request WITH that exact cookie: the count must be remembered
    const res2 = await api.get("/count", {
      headers: { cookie: `session=${id}` },
    });
    expect(await res2.json()).toEqual({ count: 1 });
  });
});

describe("missing store", () => {
  const api = server({ store: null })
    .get("/read", (ctx) => `Bye ${ctx.session.a}`)
    .get("/write", (ctx) => {
      ctx.session.a = "hello";
      return "All good";
    })
    .test();

  it("cannot read a session without a store", async () => {
    const res = await api.get("/read");
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("You need a 'store' to read 'ctx.session.a'");
  });

  it("cannot write a session without a store", async () => {
    const res = await api.get("/write");
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      "You need a 'store' to write 'ctx.session.a'",
    );
  });
});
