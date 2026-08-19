import kv from "polystore";

import type { AuthSession, AuthUser } from "..";
import server from "..";

const ID = "REqA2l022l8Q0tuI";

describe("auth", () => {
  it("requires a provider", async () => {
    // @ts-expect-error
    expect(() => server({ auth: "token" })).toThrow(
      "Auth options needs a provider",
    );
    // @ts-expect-error
    expect(() => server({ auth: "token:" })).toThrow(
      "Auth options needs a provider",
    );
  });

  it("requires a valid provider", async () => {
    // @ts-expect-error
    expect(() => server({ auth: "token:nonexisting" })).toThrow(
      /Provider "nonexisting" not found, available ones are/,
    );
  });

  it("provider must belong", async () => {
    const sessions = kv(new Map());

    sessions.set<AuthSession>(ID, {
      user: "QypOn5SQApyOPdUp",
      // @ts-expect-error
      provider: "wrong",
      created: "2024-07-01T03:21:40Z",
    });

    const api = server({
      auth: { strategy: "token", providers: ["email"], sessions },
    })
      .get("/", (ctx) => ctx.user)
      .test();

    const authorization = `Bearer ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe(
      "Invalid provider 'wrong', valid ones are: 'email'",
    );
  });
});

describe("types", () => {
  type User = AuthUser<{ firstName: string; lastName: string; age: number }>;

  server<{ user: User }>({ auth: "token:email" })
    .get("/", (ctx) => ctx.user.lastName)
    .test();
});

describe("token", () => {
  const sessions = kv(new Map());
  const users = kv(new Map());
  const api = server({
    auth: { strategy: "token", providers: ["email"], users, sessions },
  })
    .get("/", (ctx) => ctx.user)
    .test();

  afterEach(async () => {
    await sessions.del(ID);
    await users.del("QypOn5SQApyOPdUp");
  });

  it("should be Bearer", async () => {
    const authorization = `Basic ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe(
      "Invalid authorization header Basic, must send 'Bearer {TOKEN}' (with space)",
    );
  });

  it("should have the proper token", async () => {
    const authorization = "Bearer hola";
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Invalid Authorization token");
  });

  it("cannot get the session", async () => {
    const authorization = `Bearer ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(404);
  });

  it("cannot get the user", async () => {
    sessions.set(ID, {
      user: "QypOn5SQApyOPdUp",
      provider: "email",
      created: "2024-07-01T03:21:40Z",
    });
    const authorization = `Bearer ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Credentials do not correspond to a user");
  });

  it("can get the user", async () => {
    sessions.set(ID, {
      user: "QypOn5SQApyOPdUp",
      provider: "email",
      created: "2024-07-01T03:21:40Z",
    });
    users.set("QypOn5SQApyOPdUp", {
      id: "QypOn5SQApyOPdUp",
      provider: "email",
      email: "abc@test.com",
    });
    const authorization = "Bearer REqA2l022l8Q0tuI";
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(200);
  });
});

describe("cookie", () => {
  const sessions = kv(new Map());
  const users = kv(new Map());
  const api = server({
    auth: { strategy: "cookie", providers: ["email"], users, sessions },
  })
    .get("/", (ctx) => ctx.user)
    .test();

  it("treats an unknown session cookie as a guest", async () => {
    const cookie = "session=hello";
    const res = await api.get("/", { headers: { cookie } });
    expect(res.status).toBe(404); // no user, the handler returns nothing
  });

  it("resolves the user from the session cookie", async () => {
    await sessions.set(ID, {
      user: "QypOn5SQApyOPdUp",
      provider: "email",
      created: "2024-07-01T03:21:40Z",
    });
    await users.set("QypOn5SQApyOPdUp", {
      id: "QypOn5SQApyOPdUp",
      provider: "email",
      email: "abc@test.com",
    });
    const cookie = `session=${ID}`;
    const res = await api.get("/", { headers: { cookie } });
    expect(res.status).toBe(200);
    expect((await res.json()).email).toBe("abc@test.com");
  });
});
