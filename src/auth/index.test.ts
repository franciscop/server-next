import kv from "polystore";

import type { AuthSession, AuthUser } from "..";
import server from "..";

const ID = "REqA2l022l8Q0tuI";

describe("auth", () => {
  it("requires a provider", async () => {
    expect(() => server({ auth: "token" })).toThrow(
      "Auth options needs a provider",
    );
    expect(() => server({ auth: "token:" })).toThrow(
      "Auth options needs a provider",
    );
  });

  it("requires a valid provider", async () => {
    expect(() => server({ auth: "token:nonexisting" })).toThrow(
      /Provider "nonexisting" not found, available ones are/,
    );
  });

  it("provider must belong", async () => {
    const store = kv(new Map());

    store.set<AuthSession>(`auth:${ID}`, {
      id: ID,
      strategy: "token",
      // @ts-expect-error
      provider: "wrong",
      user: "QypOn5SQApyOPdUp",
    });

    const api = server({ store, auth: "token:email" })
      .get("/", (ctx) => ctx.user)
      .test();

    const authorization = `Bearer ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      "Invalid provider 'wrong', valid ones are: 'email'",
    );
  });
});

describe("types", () => {
  const store = kv(new Map());

  type User = AuthUser<{ firstName: string; lastName: string; age: number }>;
  type ServerTypes = { User: User };

  server<ServerTypes>({ store, auth: "token:email" })
    .get("/", (ctx) => ctx.user.lastName)
    .test();
});

describe("token", () => {
  const store = kv(new Map());
  const api = server({ store, auth: "token:email" })
    .get("/", (ctx) => ctx.user)
    .test();

  afterEach(async () => {
    await store.del(`auth:${ID}`);
    await store.del(`user:QypOn5SQApyOPdUp`);
  });

  it("should be Bearer", async () => {
    const authorization = `Basic ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      "Invalid authorization header Basic, must send 'Bearer {TOKEN}' (with space)",
    );
  });

  it("should have the proper token", async () => {
    const authorization = "Bearer hola";
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Invalid Authorization token");
  });

  it("cannot get the session", async () => {
    const authorization = `Bearer ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(404);
  });

  it("cannot get the user", async () => {
    store.set(`auth:${ID}`, {
      id: ID,
      strategy: "token",
      provider: "email",
      user: "QypOn5SQApyOPdUp",
      email: "abc@test.com",
      time: "2024-07-01T03:21:40Z",
    });
    const authorization = `Bearer ${ID}`;
    const res = await api.get("/", { headers: { authorization } });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Credentials do not correspond to a user");
  });

  it("can get the user", async () => {
    store.set(`auth:${ID}`, {
      id: ID,
      strategy: "token",
      provider: "email",
      user: "QypOn5SQApyOPdUp",
    });
    store.set("user:QypOn5SQApyOPdUp", {
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
  const store = kv(new Map());
  const api = server({ store, auth: "cookie:email" })
    .get("/", (ctx) => ctx.user)
    .test();

  it("should have the proper token in email", async () => {
    const cookie = "authentication=hello";
    const res = await api.get("/", { headers: { cookie } });
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Invalid Authorization cookie");
  });

  it("can get the proper session", async () => {
    const cookie = "authentication=REqA2l022l8Q0tuI";
    const res = await api.get("/", { headers: { cookie } });
    expect(res.status).toBe(404);
  });

  it("can get the proper session", async () => {
    const cookie = "authentication=REqA2l022l8Q0tuI";
    const res = await api.get("/", { headers: { cookie } });
    expect(res.status).toBe(404);
  });
});
