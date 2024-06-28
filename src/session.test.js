import kv from "polystore";

import server from "./index.js";

const url = (path, options = {}) =>
  new Request("http://localhost:3000" + path, {
    headers: { cookie: "session=REqA2l022l8Q0tuIRtqLOPUy" },
    ...options,
  });

describe("session", () => {
  const store = kv(new Map());
  const app = server({ store })
    .get("/hello", (ctx) => "Hello " + ctx.session.a)
    .post("/hello", (ctx) => {
      if (!ctx.session.a) ctx.session.a = 0;
      ctx.session.a += 1;
      return "Bye " + ctx.session.a;
    })
    .get("/", () => "Fallback");

  it("can get the nested get", async () => {
    await store.set("session:REqA2l022l8Q0tuIRtqLOPUy", { a: 0 });

    const res = await app.fetch(url("/hello"));
    expect(await res.text()).toBe("Hello 0");

    const res2 = await app.fetch(url("/hello", { method: "POST" }));
    expect(await res2.text()).toBe("Bye 1");
    const res3 = await app.fetch(url("/hello"));
    expect(await res3.text()).toBe("Hello 1");
    expect(await store.get("session:REqA2l022l8Q0tuIRtqLOPUy")).toEqual({
      a: 1,
    });

    const res4 = await app.fetch(url("/hello", { method: "POST" }));
    expect(await res4.text()).toBe("Bye 2");
    const res5 = await app.fetch(url("/hello"));
    expect(await res5.text()).toBe("Hello 2");
    expect(await store.get("session:REqA2l022l8Q0tuIRtqLOPUy")).toEqual({
      a: 2,
    });
  });

  const missingStore = server({ store: null })
    .get("/read", (ctx) => "Bye " + ctx.session.a)
    .get("/write", (ctx) => {
      ctx.session.a = "hello";
      return "All good";
    });

  it("cannot read a session without a store", async () => {
    const res = await missingStore.fetch(url("/read"));
    const body = await res.text();
    expect(res.status).toBe(500);
    expect(body).toBe("You need a 'store' to read 'ctx.session.a'");
  });

  it("cannot write a session without a store", async () => {
    const res = await missingStore.fetch(url("/write"));
    const body = await res.text();
    expect(res.status).toBe(500);
    expect(body).toBe("You need a 'store' to write 'ctx.session.a'");
  });
});
