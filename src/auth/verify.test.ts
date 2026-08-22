import server from "..";
import { signRS256, testIssuer } from "./tests/issuer";

// A token minted elsewhere: no routes, no client secret, just a signature,
// an issuer and an audience. See docs/5. Authentication.md.
describe("checking a token minted elsewhere", () => {
  const ISSUER = "https://issuer.test";
  const AUDIENCE = "my-api";
  let issuer: Awaited<ReturnType<typeof testIssuer>>;

  beforeAll(async () => {
    issuer = await testIssuer(ISSUER);
  });
  afterAll(() => issuer.restore());

  const app = () =>
    server({ auth: { issuer: ISSUER, audience: AUDIENCE } }).get(
      "/me",
      (ctx) => ctx.user ?? "anonymous",
    );

  const withToken = (token: string) =>
    app().test().get("/me", { headers: { authorization: `Bearer ${token}` } });

  it("finds the keys through the discovery document", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: "u1",
      email: "ada@x.com",
    });
    const res = await withToken(token);
    expect(res.status).toBe(200);
    expect((await res.json()).email).toBe("ada@x.com");
  });

  it("no token is anonymous, not an error", async () => {
    expect(await (await app().test().get("/me")).text()).toBe("anonymous");
  });

  it("rejects a token signed by someone else", async () => {
    const other = await testIssuer("https://evil.test", false);
    const token = await signRS256(other.key, {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: "u1",
    });
    expect((await withToken(token)).status).toBe(401);
  });

  it("rejects a token minted for another app, same issuer", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: "other-app",
      sub: "u1",
    });
    expect((await withToken(token)).status).toBe(401);
  });

  it("rejects a token from another issuer", async () => {
    const token = await signRS256(issuer.key, {
      iss: "https://evil.test",
      aud: AUDIENCE,
      sub: "u1",
    });
    expect((await withToken(token)).status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: "u1",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect((await withToken(token)).status).toBe(401);
  });

  it("rejects garbage without crashing", async () => {
    expect((await withToken("not.a.jwt")).status).toBe(401);
  });

  it("maps the claims to your own row through getUser", async () => {
    const rows = new Map([["u1", { id: "u1", role: "admin" }]]);
    const mapped = server({
      auth: {
        issuer: ISSUER,
        audience: AUDIENCE,
        getUser: (id: string) => rows.get(id),
      },
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: "u1",
    });
    const res = await mapped
      .test()
      .get("/me", { headers: { authorization: `Bearer ${token}` } });
    expect((await res.json()).role).toBe("admin");
  });

  it("requires an audience, since one issuer serves many apps", () => {
    expect(() => server({ auth: { issuer: ISSUER } as any })).toThrow(/audience/);
  });
});

// The same verification, with the token read from a cookie instead of the
// Authorization header: what a same-origin Clerk app sends.
describe("a vendor token in a cookie", () => {
  const ISSUER = "https://cookie-issuer.test";
  let issuer: Awaited<ReturnType<typeof testIssuer>>;

  beforeAll(async () => {
    issuer = await testIssuer(ISSUER);
  });
  afterAll(() => issuer.restore());

  const app = () =>
    server({
      auth: { issuer: ISSUER, audience: "my-api", cookie: "__session" },
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

  it("reads the named cookie", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: "my-api",
      sub: "u1",
      email: "ada@x.com",
    });
    const res = await app()
      .test()
      .get("/me", { headers: { cookie: `__session=${token}` } });
    expect((await res.json()).email).toBe("ada@x.com");
  });

  it("ignores the Authorization header when a cookie is named", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: "my-api",
      sub: "u1",
    });
    const res = await app()
      .test()
      .get("/me", { headers: { authorization: `Bearer ${token}` } });
    expect(await res.text()).toBe("anonymous");
  });

  it("still rejects a tampered cookie", async () => {
    const res = await app()
      .test()
      .get("/me", { headers: { cookie: "__session=not.a.jwt" } });
    expect(res.status).toBe(401);
  });
});

// Not every issuer puts the audience in `aud`: Clerk uses `azp` and Cognito
// access tokens use `client_id`, which is why it is configurable per vendor.
describe("the audience claim", () => {
  const ISSUER = "https://claim-issuer.test";
  let issuer: Awaited<ReturnType<typeof testIssuer>>;

  beforeAll(async () => {
    issuer = await testIssuer(ISSUER);
  });
  afterAll(() => issuer.restore());

  const app = (audienceClaim?: string | string[]) =>
    server({
      auth: { issuer: ISSUER, audience: "my-app", audienceClaim },
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

  const call = (app: any, token: string) =>
    app.test().get("/me", { headers: { authorization: `Bearer ${token}` } });

  it("accepts a Clerk-shaped token, which has azp and no aud", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      azp: "my-app",
      sub: "u1",
      sid: "sess_1",
    });
    // The default would reject it outright: there is no `aud` to check
    expect((await call(app(), token)).status).toBe(401);
    expect((await call(app("azp"), token)).status).toBe(200);
  });

  it("still rejects an azp meant for another app", async () => {
    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      azp: "another-app",
      sub: "u1",
    });
    expect((await call(app("azp"), token)).status).toBe(401);
  });

  it("takes either claim, for Cognito's two token types", async () => {
    const idToken = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: "my-app",
      sub: "u1",
      token_use: "id",
    });
    const accessToken = await signRS256(issuer.key, {
      iss: ISSUER,
      client_id: "my-app",
      sub: "u1",
      token_use: "access",
    });
    const both = app(["aud", "client_id"]);
    expect((await call(both, idToken)).status).toBe(200);
    expect((await call(both, accessToken)).status).toBe(200);
  });

  it("rejects a token carrying none of the configured claims", async () => {
    const token = await signRS256(issuer.key, { iss: ISSUER, sub: "u1" });
    expect((await call(app(["aud", "client_id"]), token)).status).toBe(401);
  });
});
