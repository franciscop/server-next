import server from "..";

// Every shape of `auth` ends in a plain `ctx.user`.
// See docs/5. Authentication.md.
describe("the shapes of `auth`", () => {
  const me = (app: any, opts?: any) => app.test().get("/me", opts);

  it("a function: request in, user out", async () => {
    const app = server({
      auth: (ctx: any) =>
        ctx.headers["x-api-key"] === "k" ? { id: "1", email: "a@b.c" } : undefined,
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

    expect(await (await me(app, { headers: { "x-api-key": "k" } })).json()).toMatchObject({
      email: "a@b.c",
    });
    expect(await (await me(app)).text()).toBe("anonymous");
  });

  it("a function runs once per request, even when read twice", async () => {
    let calls = 0;
    const app = server({
      auth: () => {
        calls++;
        return { id: "1" };
      },
    }).get("/me", (ctx) => `${ctx.user?.id}${ctx.user?.id}`);

    await me(app);
    expect(calls).toBe(1);
  });

  it("does not resolve a user when no auth is configured", async () => {
    const app = server().get("/me", (ctx) => ctx.user ?? "anonymous");
    expect(await (await me(app)).text()).toBe("anonymous");
  });

  it("refuses an array: one method per app, several providers inside it", () => {
    expect(() => server({ auth: [() => ({ id: "a" })] as any })).toThrow(
      /one method/,
    );
  });

  it("a library instance: its routes are mounted at its own path", async () => {
    const app = server({
      auth: {
        path: "/api/auth",
        handler: (request: Request) =>
          new Response(`handled ${new URL(request.url).pathname}`),
        user: () => ({ id: "1" }),
      },
    }).get("/me", (ctx) => ctx.user ?? "anonymous");

    const res = await app.test().get("/api/auth/sign-in/social");
    expect(await res.text()).toBe("handled /api/auth/sign-in/social");
  });

  it("refuses an unknown shape at boot rather than ignoring it", () => {
    expect(() => server({ auth: 42 as any })).toThrow(/auth/i);
  });
});
