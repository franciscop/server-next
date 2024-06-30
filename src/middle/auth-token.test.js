import "../test/toSucceed.js";

import kv from "polystore";

import server from "../index.js";

describe("user creation flow", () => {
  // These are obviously mock data
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const store = kv(new Map());
  const auth = { type: "token", providers: "email" };
  const api = server({ auth, store })
    .get("/me", (ctx) => ctx.user || "No data")
    .test();

  it("can create a new user", async () => {
    const register = await api.post("/auth/register/email", CREDENTIALS);
    expect(register).toSucceed();
    expect(await store.keys()).toEqual([
      "auth:abc@test.com",
      "session:" + register.data.token,
    ]);

    const headers = { authorization: "Bearer " + register.data.token };
    const me = await api.get("/me", { headers });
    expect(me).toSucceed();
    expect(me.data.email).toEqual(EMAIL);

    const logout = await api.post("/auth/logout", {}, { headers });
    expect(logout).toSucceed();
    expect(await store.keys()).toEqual(["auth:abc@test.com"]);

    const login = await api.post("/auth/login/email", CREDENTIALS);
    expect(login).toSucceed();
    expect(await store.keys()).toEqual([
      "auth:abc@test.com",
      "session:" + login.data.token,
    ]);
  });
});
