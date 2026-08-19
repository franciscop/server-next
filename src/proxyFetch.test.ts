import server, { headers } from ".";

// Returning (or sending) the result of fetch() is the proxy pattern, and it
// takes a branch of its own: a real fetch Response carries a `url`, so it is
// copied into a fresh Response and its content-encoding is dropped, since the
// body has already been decoded by fetch and would otherwise be advertised as
// still compressed. A hand-made `new Response()` has no `url`, so only a real
// upstream exercises this.
describe("proxying a fetch() response", () => {
  const port = 8791;
  let upstream: any;

  beforeAll(async () => {
    upstream = await (
      server({ port }).get("/data", () => ({ from: "upstream" })) as any
    ).node();
  });

  afterAll(() => upstream?.close());

  it("returns it, body and status intact", async () => {
    const api = server()
      .get("/proxy", () => fetch(`http://localhost:${port}/data`))
      .test();
    const res = await api.get("/proxy");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ from: "upstream" });
  });

  it("sends it, with headers of our own on top", async () => {
    const api = server()
      .get("/proxy", () =>
        headers("x-cache", "miss").send(fetch(`http://localhost:${port}/data`)),
      )
      .test();
    const res = await api.get("/proxy");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-cache")).toBe("miss");
    expect(await res.json()).toEqual({ from: "upstream" });
  });

  it("drops a content-encoding fetch already decoded", async () => {
    const gzPort = 8792;
    const gz = await (
      server({ port: gzPort }).get("/gz", () => {
        const body = Bun.gzipSync(new TextEncoder().encode("compressed"));
        return new Response(body, {
          headers: { "content-encoding": "gzip", "content-type": "text/plain" },
        });
      }) as any
    ).node();
    try {
      const api = server()
        .get("/proxy", () => fetch(`http://localhost:${gzPort}/gz`))
        .test();
      const res = await api.get("/proxy");
      // fetch decoded it, so the header must not claim otherwise
      expect(res.headers.get("content-encoding")).toBeNull();
      expect(await res.text()).toBe("compressed");
    } finally {
      gz.close();
    }
  });
});
