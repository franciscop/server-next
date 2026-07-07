import server, { cache } from ".";

describe("cache() reply helper", () => {
  it("sets Cache-Control from a duration string", () => {
    const res = cache("1h").send("hi");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("accepts a number of seconds", () => {
    const res = cache(3600).send("hi");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("false becomes no-store", () => {
    const res = cache(false).send("hi");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("cache option", () => {
  it("applies a global default to GET responses", async () => {
    const res = await server({ cache: "1h" })
      .get("/", () => "hi")
      .test()
      .get("/");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("does not cache non-GET responses", async () => {
    const res = await server({ cache: "1h" })
      .post("/", () => "hi")
      .test()
      .post("/");
    expect(res.headers.get("cache-control")).toBe(null);
  });

  it("does not cache non-200 responses", async () => {
    const res = await server({ cache: "1h" })
      .get("/", () => 201)
      .test()
      .get("/");
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe(null);
  });

  it("a per-route option overrides the global default", async () => {
    const res = await server({ cache: "1h" })
      .get("/", { cache: false }, () => "hi")
      .test()
      .get("/");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("a per-route option works without a global default", async () => {
    const res = await server()
      .get("/", { cache: "10m" }, () => "hi")
      .test()
      .get("/");
    expect(res.headers.get("cache-control")).toBe("public, max-age=600");
  });

  it("an explicit cache() in the handler is never overridden", async () => {
    const res = await server({ cache: "1h" })
      .get("/", () => cache("10m").send("hi"))
      .test()
      .get("/");
    expect(res.headers.get("cache-control")).toBe("public, max-age=600");
  });
});

describe("auto ETag", () => {
  it("adds a strong ETag to a buffered GET response", async () => {
    const res = await server()
      .get("/", () => "hello")
      .test()
      .get("/");
    expect(res.headers.get("etag")).toBeTruthy();
    expect(await res.text()).toBe("hello");
  });

  it("adds an ETag to a JSON response", async () => {
    const res = await server()
      .get("/", () => ({ a: 1 }))
      .test()
      .get("/");
    expect(res.headers.get("etag")).toBeTruthy();
  });

  it("returns 304 when If-None-Match matches", async () => {
    const api = server()
      .get("/", () => "hello")
      .test();
    const first = await api.get("/");
    const tag = first.headers.get("etag");
    const res = await api.get("/", { headers: { "if-none-match": tag } });
    expect(res.status).toBe(304);
    expect(await res.text()).toBe("");
  });

  it("returns 200 when If-None-Match does not match", async () => {
    const res = await server()
      .get("/", () => "hello")
      .test()
      .get("/", { headers: { "if-none-match": '"nope"' } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
  });

  it("does not ETag a streaming response", async () => {
    const stream = () =>
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("streamed"));
          c.close();
        },
      });
    const res = await server()
      .get("/", () => stream())
      .test()
      .get("/");
    expect(res.headers.get("etag")).toBe(null);
    expect(await res.text()).toBe("streamed");
  });
});
