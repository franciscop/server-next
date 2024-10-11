import "../test/toSucceed.js";

import kv from "polystore";

import server from "../index.js";

const ID = "REqA2l022l8Q0tuI";

describe("auth", () => {
  it("requires a provider", () => {
    const store = kv(new Map());
    const api = server({ store, auth: "token:email" })
      .get("/", (ctx) => ctx.auth)
      .test();
  });

  it("provider must belong", async () => {
    const store = kv(new Map());
    const api = server({ store, auth: "token:email" })
      .get("/", (ctx) => ctx.auth)
      .test();

    store.set(`auth:${ID}`, {
      id: ID,
      type: "token",
      provider: "wrong",
      user: "QypOn5SQApyOPdUp",
      email: "abc@test.com",
      time: "2024-07-01T03:21:40Z",
    });
    const authorization = "Bearer REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed(
      'Invalid provider "wrong", valid ones are: "email"',
    );
  });
});

describe("token", () => {
  const store = kv(new Map());
  const api = server({ store, auth: "token:email" })
    .get("/", (ctx) => ctx.auth)
    .test();

  afterEach(async () => {
    await store.del(`auth:${ID}`);
  });

  it("should be Bearer", async () => {
    const authorization = "Basic REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Invalid Authorization type, 'Basic'");
  });

  it("should have the proper token", async () => {
    const authorization = "Bearer hola";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Invalid Authorization token");
  });

  it("cannot get the session", async () => {
    const authorization = "Bearer REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Invalid session");
  });

  it("cannot get the user", async () => {
    store.set(`auth:${ID}`, {
      id: ID,
      type: "token",
      provider: "email",
      user: "QypOn5SQApyOPdUp",
      email: "abc@test.com",
      time: "2024-07-01T03:21:40Z",
    });
    const authorization = "Bearer REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Credentials do not correspond to a user");
  });

  it("cannot get the user", async () => {
    store.set("auth:REqA2l022l8Q0tuI", {
      id: "REqA2l022l8Q0tuI",
      type: "token",
      provider: "email",
      user: "QypOn5SQApyOPdUp",
      email: "abc@test.com",
      time: "2024-07-01T03:21:40Z",
    });
    store.set("user:QypOn5SQApyOPdUp", {
      id: "QypOn5SQApyOPdUp",
      email: "abc@test.com",
    });
    const authorization = "Bearer REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).toSucceed();
  });
});

describe("cookie", () => {
  const store = kv(new Map());
  const api = server({ store, auth: "cookie:email" })
    .get("/", (ctx) => ctx.auth)
    .test();

  it("should have the proper token in email", async () => {
    const cookie = "authentication=hello";
    const req = await api.get("/", { headers: { cookie } });
    expect(req).not.toSucceed("Invalid Authorization cookie");
  });

  it("can get the proper session", async () => {
    const cookie = "authentication=REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { cookie } });
    expect(req).not.toSucceed("Invalid session");
  });

  it("can get the proper session", async () => {
    const cookie = "authentication=REqA2l022l8Q0tuI";
    const req = await api.get("/", { headers: { cookie } });
    expect(req).not.toSucceed();
  });
});
