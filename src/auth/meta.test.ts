import server from "..";
import { signJwt } from "../helpers/jwt";
import { signRS256, testIssuer } from "./tests/issuer";

// `ctx.auth` is what the credential itself asserts, with no lookup behind it.
// See docs/5. Authentication.md.
describe("ctx.auth", () => {
  const rows = new Map([["u1", { id: "u1", email: "ada@x.com" }]]);
  const base = {
    providers: "github",
    onLogin: (profile: any) => profile.id,
    getUser: (id: string) => rows.get(id),
  };

  beforeAll(() => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
  });

  const app = (extra: any = {}) =>
    server({ secrets: "s", auth: { ...base, ...extra } }).get("/auth", (ctx) =>
      ctx.auth ? { ...ctx.auth, user: (ctx.user as any)?.id } : "none",
    );

  it("is absent without a credential", async () => {
    expect(await (await app().test().get("/auth")).text()).toBe("none");
  });

  it("carries the issue and expiry times", async () => {
    const token = await signJwt({ sub: "u1" }, "s", 3600);
    const body = await (
      await app().test().get("/auth", { headers: { cookie: `session=${token}` } })
    ).json();

    const issued = new Date(body.issuedAt).getTime();
    const expires = new Date(body.expiresAt).getTime();
    expect(Date.now() - issued).toBeLessThan(5000);
    expect(Math.round((expires - issued) / 1000)).toBe(3600);
    expect(body.user).toBe("u1");
  });

  it("says which strategy this request used, when several are accepted", async () => {
    const both = app({ strategy: ["session", "jwt"], toPublicUser: (u: any) => u });
    const token = await signJwt({ sub: "u1" }, "s", 3600);

    const viaCookie = await both
      .test()
      .get("/auth", { headers: { cookie: `session=${token}` } });
    expect((await viaCookie.json()).strategy).toBe("session");

    const viaHeader = await both
      .test()
      .get("/auth", { headers: { authorization: `Bearer ${token}` } });
    expect((await viaHeader.json()).strategy).toBe("jwt");
  });

  it("carries the provider a login came through", async () => {
    // Signed in at login, so it survives without a lookup of yours
    const token = await signJwt({ sub: "u1", provider: "github" }, "s", 3600);
    const body = await (
      await app().test().get("/auth", { headers: { cookie: `session=${token}` } })
    ).json();
    expect(body.provider).toBe("github");
  });

  it("is absent for a function, which has no credential of ours to read", async () => {
    const custom = server({ auth: () => ({ id: "u1" }) }).get("/auth", (ctx) =>
      ctx.auth ? "some" : "none",
    );
    expect(await (await custom.test().get("/auth")).text()).toBe("none");
  });
});

describe("ctx.auth for a token minted elsewhere", () => {
  const ISSUER = "https://meta-issuer.test";
  let issuer: Awaited<ReturnType<typeof testIssuer>>;

  beforeAll(async () => {
    issuer = await testIssuer(ISSUER);
  });
  afterAll(() => issuer.restore());

  it("reads the claims, and names the issuer as the provider", async () => {
    const app = server({
      auth: { issuer: ISSUER, audience: "my-api" },
    }).get("/auth", (ctx) => ctx.auth ?? "none");

    const token = await signRS256(issuer.key, {
      iss: ISSUER,
      aud: "my-api",
      sub: "u1",
    });
    const body = await (
      await app.test().get("/auth", { headers: { authorization: `Bearer ${token}` } })
    ).json();

    expect(body.provider).toBe(ISSUER);
    expect(body.strategy).toBe("jwt");
    expect(Date.now() - new Date(body.issuedAt).getTime()).toBeLessThan(5000);
  });
});
