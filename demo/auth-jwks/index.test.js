// This demo has its own dependency (jose) in its own node_modules, so the
// tests only run after `npm install` here. A fresh checkout (CI) has not done
// that, so skip rather than fail the whole suite.
const jose = await import("jose").catch(() => null);
const suite = jose ? describe : describe.skip;

suite("verifying hosted-auth JWTs", () => {
  // A local "issuer": its own keys, its own discovery document and JWKS
  // endpoint, served by another server() instance, so the whole hosted-auth
  // flow runs with no vendor at all.
  const ISSUER = "http://localhost:3001";
  const AUDIENCE = "my-app";

  let api;
  let token;

  beforeAll(async () => {
    const { SignJWT, exportJWK, generateKeyPair } = jose;
    const { default: server } = await import("../..");
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig" };

    const issuer = server({ port: 3001 })
      .get("/.well-known/openid-configuration", () => ({
        issuer: ISSUER,
        jwks_uri: `${ISSUER}/keys`, // deliberately not "jwks.json": nobody uses that
      }))
      .get("/keys", () => ({ keys: [jwk] }))
      .test();

    // The network fetches jose and the app make are answered by the issuer app
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      if (String(url).startsWith(ISSUER)) {
        return issuer.get(new URL(url).pathname);
      }
      return realFetch(url, opts);
    };

    const { default: app } = await import("./index.js");
    api = app.test();

    token = ({ aud = AUDIENCE, iss = ISSUER, key = privateKey, ...claims }) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setIssuer(iss)
        .setAudience(aud)
        .setExpirationTime("5m")
        .sign(key);
  });

  const meWith = async (jwt) =>
    api.get("/me", { headers: { authorization: `Bearer ${jwt}` } });

  it("finds the keys through the discovery document", async () => {
    const me = await meWith(await token({ sub: "u1", email: "ada@x.com" }));
    expect(me.status).toBe(200);
    expect((await me.json()).email).toBe("ada@x.com");
  });

  it("no token is anonymous", async () => {
    expect((await api.get("/me")).status).toBe(401);
  });

  it("rejects a token signed by someone else", async () => {
    const { privateKey: mallory } = await jose.generateKeyPair("RS256");
    const jwt = await token({ sub: "u1", email: "bad@x.com", key: mallory });
    expect((await meWith(jwt)).status).toBe(401);
  });

  it("rejects a token minted for another app, same issuer", async () => {
    // The signature is valid: only the audience check catches this one
    const jwt = await token({ sub: "u1", email: "bad@x.com", aud: "other-app" });
    expect((await meWith(jwt)).status).toBe(401);
  });

  it("rejects a token from another issuer", async () => {
    const jwt = await token({
      sub: "u1",
      email: "bad@x.com",
      iss: "https://evil.example",
    });
    expect((await meWith(jwt)).status).toBe(401);
  });

  it("rejects garbage without crashing", async () => {
    expect((await meWith("not.a.jwt")).status).toBe(401);
  });
});
