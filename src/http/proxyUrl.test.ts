import server from "../index";

// Behind a TLS-terminating proxy (Traefik, nginx, Cloudflare) the app receives
// plain HTTP, so the scheme and host on the wire are not the ones the visitor
// used. `trustProxy` is on by default, so the forwarded headers decide.
describe("ctx.url behind a proxy", () => {
  const app = server().get("/where", (ctx) => ({
    origin: ctx.url.origin,
    href: ctx.url.href,
  }));
  const api = app.test();

  it("takes the scheme from x-forwarded-proto", async () => {
    const res = await api.get("/where", {
      headers: { "x-forwarded-proto": "https" },
    });
    // The host is whatever the request carried; only the scheme is forwarded
    expect((await res.json()).origin).toStartWith("https://");
  });

  it("takes the host from x-forwarded-host", async () => {
    const res = await api.get("/where", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "uptimecore.com",
        host: "internal-service.local:3000",
      },
    });
    expect((await res.json()).origin).toBe("https://uptimecore.com");
  });

  it("keeps a non-default forwarded port", async () => {
    const res = await api.get("/where", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "example.com",
        "x-forwarded-port": "8443",
      },
    });
    expect((await res.json()).origin).toBe("https://example.com:8443");
  });

  it("uses the first hop when proxies chain", async () => {
    // The visitor's scheme is the leftmost value; trusting the last would let
    // an inner hop (or a client) claim whatever it likes
    const res = await api.get("/where", {
      headers: {
        "x-forwarded-proto": "https, http",
        "x-forwarded-host": "uptimecore.com, internal.local",
      },
    });
    expect((await res.json()).origin).toBe("https://uptimecore.com");
  });

  it("ignores a scheme that is not http or https", async () => {
    const res = await api.get("/where", {
      headers: { "x-forwarded-proto": "javascript" },
    });
    expect((await res.json()).origin).toStartWith("http://");
  });

  it("ignores the headers when trustProxy is off", async () => {
    const strict = server({ security: { trustProxy: false } })
      .get("/where", (ctx) => ctx.url.origin)
      .test();
    const res = await strict.get("/where", {
      headers: { "x-forwarded-proto": "https", host: "uptimecore.com" },
    });
    expect(await res.text()).not.toContain("https://");
  });

  it("leaves the path and query alone", async () => {
    const res = await api.get("/where?a=1", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "uptimecore.com",
      },
    });
    expect((await res.json()).href).toBe("https://uptimecore.com/where?a=1");
  });
});

// The bug as reported: the OAuth redirect_uri is built from ctx.url.origin,
// and no user middleware can repair it because the auth routes are registered
// before any `.use()` the app adds.
describe("the OAuth redirect_uri behind a proxy", () => {
  it("registers the https callback GitHub was configured with", async () => {
    process.env.GITHUB_CLIENT_ID = "id";
    process.env.GITHUB_CLIENT_SECRET = "secret";
    const api = server({ secrets: "s", auth: "cookie:github" }).test();

    const res = await api.get("/auth/login/github", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "uptimecore.com",
      },
    });
    const authorize = new URL(res.headers.get("location")!);
    expect(authorize.searchParams.get("redirect_uri")).toBe(
      "https://uptimecore.com/auth/callback/github",
    );
  });
});

// The same question ctx.ip asks: whoever connected wrote these headers, so
// they are only the visitor's when our own proxy is the one who connected.
describe("ctx.url from an untrusted peer", () => {
  const where = (options = {}) =>
    server(options)
      .get("/where", (ctx) => ({ origin: ctx.url.origin }))
      .test();

  it("ignores the forwarded scheme and host with trustProxy false", async () => {
    const res = await where({ security: { trustProxy: false } }).get("/where", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.com",
      },
    });
    expect((await res.json()).origin).toBe("http://localhost:3000");
  });

  it("takes them from loopback, which is where a proxy connects from", async () => {
    const res = await where().get("/where", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "uptimecore.com",
      },
    });
    expect((await res.json()).origin).toBe("https://uptimecore.com");
  });
});
