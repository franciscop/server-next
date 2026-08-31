import server from ".";

// `.test()` is the one place a user hands us objects they keep and reuse, so
// it must treat them as read-only: a stamped content-type on a shared headers
// object silently changes how every later request is parsed.
describe("the test client leaves the caller's objects alone", () => {
  it("does not stamp content-type onto a reused headers object", async () => {
    const api = server({ log: false })
      .post("/", (ctx) => ({ type: ctx.headers["content-type"] }))
      .test();
    const shared = { headers: { authorization: "Bearer x" } };

    await api.post("/", { a: 1 }, shared);

    expect(shared.headers).toEqual({ authorization: "Bearer x" });
  });

  it("keeps a multipart upload multipart after a JSON request", async () => {
    const api = server({ log: false, uploads: false })
      .post("/", (ctx: any) => ({ fields: Object.keys(ctx.body ?? {}) }))
      .test();
    const shared = { headers: { authorization: "Bearer x" } };
    const form = () => {
      const body = new FormData();
      body.append("hello", "world");
      return body;
    };

    await api.post("/", { a: 1 }, shared);
    const res = await api.post("/", form(), shared);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fields: ["hello"] });
  });

  it("does not add a headers key to an options object without one", async () => {
    const api = server({ log: false })
      .get("/", () => "hi")
      .test();
    const shared: Record<string, unknown> = {};

    await api.get("/", shared);

    expect(shared).toEqual({});
  });

  it("accepts the other RequestInit header shapes", async () => {
    const api = server({ log: false })
      .get("/", (ctx) => ({ via: ctx.headers["x-via"] }))
      .test();

    const asHeaders = await api.get("/", {
      headers: new Headers({ "x-via": "instance" }),
    });
    expect(await asHeaders.json()).toEqual({ via: "instance" });

    const asEntries = await api.get("/", { headers: [["x-via", "entries"]] });
    expect(await asEntries.json()).toEqual({ via: "entries" });
  });
});
