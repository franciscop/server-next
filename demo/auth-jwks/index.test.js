import server from "../..";
import { signRS256, testIssuer } from "../../src/auth/tests/issuer.ts";

// The whole hosted-auth path against a local issuer: its own RSA key pair, its
// own discovery document and its own JWKS endpoint. No vendor, no network.
describe("verifying hosted-auth JWTs", () => {
  const ISSUER = "http://localhost:3001";
  const AUDIENCE = "my-app";
  let issuer;

  beforeAll(async () => {
    issuer = await testIssuer(ISSUER);
  });
  afterAll(() => issuer.restore());

  const app = server({ auth: { verify: ISSUER, audience: AUDIENCE } })
    .get("/me", (ctx) => ctx.user ?? 401)
    .get("/admin", (ctx) => {
      if (!ctx.user) return 401;
      if (ctx.user.app_metadata?.role !== "admin") return 403;
      return "welcome";
    });

  const meWith = (jwt) =>
    app.test().get("/me", { headers: { authorization: `Bearer ${jwt}` } });

  const token = (claims) =>
    signRS256(issuer.key, { iss: ISSUER, aud: AUDIENCE, ...claims });

  it("finds the keys through the discovery document", async () => {
    const res = await meWith(await token({ sub: "u1", email: "ada@x.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).email).toBe("ada@x.com");
  });

  it("no token is anonymous", async () => {
    expect((await app.test().get("/me")).status).toBe(401);
  });

  it("rejects a token signed by someone else", async () => {
    const mallory = await testIssuer("https://evil.test", false);
    const jwt = await signRS256(mallory.key, {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: "u1",
    });
    expect((await meWith(jwt)).status).toBe(401);
  });

  it("rejects a token minted for another app, same issuer", async () => {
    // The signature is valid: only the audience check catches this one
    const jwt = await token({ sub: "u1", aud: "other-app" });
    expect((await meWith(jwt)).status).toBe(401);
  });

  it("rejects a token from another issuer", async () => {
    const jwt = await token({ sub: "u1", iss: "https://evil.example" });
    expect((await meWith(jwt)).status).toBe(401);
  });

  it("rejects garbage without crashing", async () => {
    expect((await meWith("not.a.jwt")).status).toBe(401);
  });

  it("reads a role off the claims", async () => {
    const jwt = await token({ sub: "u1", app_metadata: { role: "admin" } });
    const res = await app
      .test()
      .get("/admin", { headers: { authorization: `Bearer ${jwt}` } });
    expect(await res.text()).toBe("welcome");
  });
});
