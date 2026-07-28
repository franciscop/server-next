import server from "..";

describe("security headers", () => {
  it("sets the secure-by-default headers", async () => {
    const { headers } = await server()
      .get("/", () => 200)
      .test()
      .get("/");

    expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("x-xss-protection")).toBe("0");
  });

  it("leaves the opt-in headers off by default", async () => {
    const { headers } = await server()
      .get("/", () => 200)
      .test()
      .get("/");

    expect(headers.get("content-security-policy")).toBe(null);
    expect(headers.get("cross-origin-opener-policy")).toBe(null);
    expect(headers.get("cross-origin-resource-policy")).toBe(null);
    expect(headers.get("permissions-policy")).toBe(null);
  });

  it("does not send HSTS outside production", async () => {
    const { headers } = await server()
      .get("/", () => 200)
      .test()
      .get("/");
    expect(headers.get("strict-transport-security")).toBe(null);
  });

  it("disables every header with security: false", async () => {
    const { headers } = await server({ security: false })
      .get("/", () => 200)
      .test()
      .get("/");

    expect(headers.get("x-frame-options")).toBe(null);
    expect(headers.get("x-content-type-options")).toBe(null);
    expect(headers.get("referrer-policy")).toBe(null);
    expect(headers.get("x-xss-protection")).toBe(null);
    expect(headers.get("strict-transport-security")).toBe(null);
  });

  it("turns off a single header with false", async () => {
    const { headers } = await server({ security: { frameguard: false } })
      .get("/", () => 200)
      .test()
      .get("/");

    expect(headers.get("x-frame-options")).toBe(null);
    // others still on
    expect(headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("overrides a header value with a string", async () => {
    const { headers } = await server({ security: { frameguard: "DENY" } })
      .get("/", () => 200)
      .test()
      .get("/");
    expect(headers.get("x-frame-options")).toBe("DENY");
  });

  it("enables opt-in headers when set", async () => {
    const csp = "default-src 'self'";
    const { headers } = await server({
      security: { csp, corp: "same-origin", permissionsPolicy: "geolocation=()" },
    })
      .get("/", () => 200)
      .test()
      .get("/");

    expect(headers.get("content-security-policy")).toBe(csp);
    expect(headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(headers.get("permissions-policy")).toBe("geolocation=()");
  });

  it("applies headers to 404s and other non-route responses", async () => {
    const { status, headers } = await server()
      .get("/", () => 200)
      .test()
      .get("/missing");

    expect(status).toBe(404);
    expect(headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("does not override a header the route already set", async () => {
    const { headers } = await server()
      .get("/", () => {
        return new Response("ok", {
          headers: { "x-frame-options": "DENY" },
        });
      })
      .test()
      .get("/");
    expect(headers.get("x-frame-options")).toBe("DENY");
  });
});

describe("traversal protection", () => {
  // '../' can only reach a param encoded (%2F): the URL parser collapses the
  // literal form before it ever gets routed.
  const app = server().get("/files/:id", (ctx) => `id:${ctx.url.params.id}`);

  it("rejects a param that climbs the path", async () => {
    const res = await app.test().get("/files/..%2F..%2F.env");
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("traversalProtection");
  });

  it("rejects a climbing param however the dots are encoded", async () => {
    const res = await app.test().get("/files/%2E%2E%2F.env");
    expect(res.status).toBe(400);
  });

  it("rejects an absolute param, which escapes without any dots", async () => {
    // Resolving an absolute path against a folder just returns the path
    const res = await app.test().get("/files/%2Fetc%2Fhosts");
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("traversalProtection");
  });

  it("rejects a Windows-style absolute param", async () => {
    for (const url of ["/files/C:%5CWindows%5Cwin.ini", "/files/%5C%5Cserver%5Cshare"]) {
      const res = await app.test().get(url);
      expect(res.status).toBe(400);
    }
  });

  it("never routes a literal '..' segment (the URL parser collapses it)", async () => {
    // '/files/..' resolves to '/' before matching, so it 404s rather than
    // reaching the route with a '..' param
    const res = await app.test().get("/files/..");
    expect(res.status).toBe(404);
  });

  it("allows normal ids", async () => {
    const res = await app.test().get("/files/photo.jpg");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("id:photo.jpg");
  });

  it("allows nested paths and dots that do not climb", async () => {
    for (const [url, id] of [
      ["/files/docs%2Freadme.md", "docs/readme.md"],
      ["/files/..hidden", "..hidden"],
      ["/files/v1..2", "v1..2"],
      ["/files/photo..jpg", "photo..jpg"],
    ]) {
      const res = await app.test().get(url);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(`id:${id}`);
    }
  });

  it("can be turned off for routes that receive real paths", async () => {
    const res = await server({ security: { traversalProtection: false } })
      .get("/files/:id", (ctx) => `id:${ctx.url.params.id}`)
      .test()
      .get("/files/..%2F..%2F.env");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("id:../../.env");
  });

  it("is off when all security is disabled", async () => {
    const res = await server({ security: false })
      .get("/files/:id", () => 200)
      .test()
      .get("/files/..%2F.env");
    expect(res.status).toBe(200);
  });
});
