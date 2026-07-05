import server from ".";

describe("body.max (request size limit)", () => {
  it("413s when Content-Length exceeds the limit", async () => {
    const api = server({ body: { max: "10b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", "x".repeat(50)); // 50 > 10
    expect(res.status).toBe(413);
  });

  it("allows a body under the limit", async () => {
    const api = server({ body: { max: "100b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", { a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("per-route max overrides the server default", async () => {
    const api = server({ body: { max: "1kb" } })
      .post("/small", { body: { max: "5b" } }, (ctx) => ctx.body)
      .post("/big", (ctx) => ctx.body) // inherits the 1kb default
      .test();
    expect((await api.post("/small", "0123456789")).status).toBe(413); // 10 > 5
    expect((await api.post("/big", "0123456789")).status).toBe(200); // 10 < 1kb
  });

  it("counts a streamed body with no Content-Length", async () => {
    const api = server({ body: { max: "8b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    // A ReadableStream body is chunked (no Content-Length), so the pre-check is
    // skipped and the streaming counter must catch it.
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("hello ")); // 6
        c.enqueue(new TextEncoder().encode("world")); // +5 = 11 > 8
        c.close();
      },
    });
    const res = await api.post("/", stream);
    expect(res.status).toBe(413);
  });

  it("has no limit by default", async () => {
    const api = server()
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", "x".repeat(10_000));
    expect(res.status).toBe(200);
  });

  it("the string shorthand still selects the mode", async () => {
    const api = server({ body: "raw" })
      .post("/", (ctx) => (Buffer.isBuffer(ctx.body) ? "raw" : "other"))
      .test();
    expect(await (await api.post("/", "hi")).text()).toBe("raw");
  });
});
