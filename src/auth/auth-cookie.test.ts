import "../tests/toSucceed";

import kv from "polystore";

import server from "..";

describe("user creation flow", () => {
  // These are obviously mock data
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const store = kv(new Map());
  const api = server({ store, auth: "cookie:email" })
    .get("/me", (ctx) => ctx.user || "No data")
    .test();

  it.skip("can create a new user", async () => {
    const register = await api.post("/auth/register/email", CREDENTIALS);
    expect(register).toSucceed();
    expect(await store.keys()).toEqual([
      "user:abc@test.com",
      `auth:${register.headers["set-cookie"].split(";")[0].split("=")[1]}`,
    ]);

    const me = await api.get("/me");
    expect(me).toSucceed();
    expect(me.body.email).toEqual(EMAIL); // FAILING

    const logout = await api.post("/auth/logout");
    expect(logout).toSucceed();
    expect(await store.keys()).toEqual(["user:abc@test.com"]);

    const login = await api.post("/auth/login/email", CREDENTIALS);
    expect(login).toSucceed();
    expect(await store.keys()).toEqual([
      "user:abc@test.com",
      `auth:${login.headers["set-cookie"].split(";")[0].split("=")[1]}`,
    ]);
  });
});
