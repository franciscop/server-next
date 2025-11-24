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
