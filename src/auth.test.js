import "./test/toSucceed.js";

import kv from "polystore";

import server from "./index.js";

describe("token", () => {
  const store = kv(new Map());
  const api = server({ store, auth: { type: "token" } })
    .get("/", (ctx) => ctx.auth)
    .test();

  it("should be Bearer", async () => {
    const authorization = "Basic REqA2l022l8Q0tuIRtqLOPUy";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Invalid Authorization type, 'Basic'");
  });

  it("should have the proper token", async () => {
    const authorization = "Bearer hola";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Invalid Authorization token");
  });

  it("can get the proper session", async () => {
    const authorization = "Bearer REqA2l022l8Q0tuIRtqLOPUy";
    const req = await api.get("/", { headers: { authorization } });
    expect(req).not.toSucceed("Credentials do not correspond to a user");
  });
});

describe("cookie", () => {
  const store = kv(new Map());
  const api = server({ store, auth: { type: "cookie" } })
    .get("/", (ctx) => ctx.auth)
    .test();

  it("should have the proper token in email", async () => {
    const cookie = "authorization=hello";
    const req = await api.get("/", { headers: { cookie } });
    expect(req).not.toSucceed("Invalid Authorization cookie");
  });

  it("can get the proper session", async () => {
    const cookie = "authorization=REqA2l022l8Q0tuIRtqLOPUy";
    const req = await api.get("/", { headers: { cookie } });
    expect(req).not.toSucceed("Credentials do not correspond to a user");
  });
});
