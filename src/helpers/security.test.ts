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
