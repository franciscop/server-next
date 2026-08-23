import server from "..";
import { signJwt } from "../helpers/jwt";
import socketUser from "./socketUser";

// The WebSocket upgrade resolves the user from the request's headers and
// cookies through the same entries as HTTP, with a partial context.
describe("socket auth", () => {
  it("returns undefined with no auth configured", async () => {
    const app = server();
    expect(await socketUser(app as any, {}, {})).toBe(undefined);
  });

  it("resolves a signed session cookie", async () => {
    env.GITHUB_ID = "id";
    env.GITHUB_SECRET = "secret";
    const rows = new Map([["u1", { id: "u1", email: "ada@x.com" }]]);
    const app = server({
      secrets: "s",
      auth: {
        providers: "github",
        onLogin: (profile) => profile.id,
        getUser: (id: string) => rows.get(id),
      },
    });
    const token = await signJwt({ sub: "u1" }, "s", 3600);

    const user = await socketUser(app as any, {}, { session: token });
    expect(user).toMatchObject({ email: "ada@x.com" });
    expect(await socketUser(app as any, {}, {})).toBe(undefined);
  });

  it("resolves a function shape from the partial context", async () => {
    const app = server({
      auth: (ctx: any) => (ctx.cookies.uid ? { id: ctx.cookies.uid } : undefined),
    });
    expect(await socketUser(app as any, {}, { uid: "b" })).toMatchObject({ id: "b" });
    expect(await socketUser(app as any, {}, {})).toBe(undefined);
  });
});
