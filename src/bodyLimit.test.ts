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

  it("defaults to a 1mb limit", async () => {
    const api = server()
      .post("/", (ctx) => (typeof ctx.body === "string" ? "ok" : ctx.body))
      .test();
    // Under 1mb passes...
    expect((await api.post("/", "x".repeat(500_000))).status).toBe(200);
    // ...over 1mb is rejected with a 413.
    const big = await api.post("/", "x".repeat(1_100_000));
    expect(big.status).toBe(413);
  });

  it("max: false disables the limit", async () => {
    const api = server({ body: { max: false } })
      .post("/", () => "ok")
      .test();
    expect((await api.post("/", "x".repeat(2_000_000))).status).toBe(200);
  });

  it("does not count multipart file bytes against the limit", async () => {
    // A 200kb file under a 10kb body limit must still succeed: file bytes stream
    // to `uploads` and are exempt; only text fields would count.
    const boundary = "----t";
    const file = "F".repeat(200_000);
    const raw =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="avatar"; filename="a.bin"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n` +
      `${file}\r\n` +
      `--${boundary}--\r\n`;
    const api = server({ uploads: "./uploads", body: { max: "10kb" } })
      .post("/", (ctx) => ({ size: (ctx.body as any).avatar.size }))
      .test();
    const res = await api.post("/", raw, {
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).size).toBe(200_000);
  });

  it("does count multipart text fields against the limit", async () => {
    const boundary = "----t";
    const raw =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="bio"\r\n\r\n` +
      `${"b".repeat(50_000)}\r\n` +
      `--${boundary}--\r\n`;
    const api = server({ uploads: "./uploads", body: { max: "10kb" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", raw, {
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    });
    expect(res.status).toBe(413);
  });

  it("the string shorthand still selects the mode", async () => {
    const api = server({ body: "raw" })
      .post("/", (ctx) => (Buffer.isBuffer(ctx.body) ? "raw" : "other"))
      .test();
    expect(await (await api.post("/", "hi")).text()).toBe("raw");
  });
});
