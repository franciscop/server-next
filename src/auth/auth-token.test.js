import "../test/toSucceed.js";

import kv from "polystore";

import server from "../index.js";

describe("user creation flow", () => {
  // These are obviously mock data
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const store = kv(new Map());
  const sessions = () => store.prefix("auth:").keys();
  const users = () => store.prefix("user:").keys();
  const api = server({ store, auth: "token:email" })
    .get("/me", (ctx) => ctx.user || "No data")
    .test();

  // Bun's bug: https://github.com/oven-sh/bun/issues/6348
  it.skip("tests a long user flow with tokens", async () => {
    // The latest updated token
    let token;

    // REGISTER A NEW USER
    token = await (async () => {
      const register = await api.post("/auth/register/email", CREDENTIALS);
      expect(register).toSucceed();

      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([register.data.token]);
      return register.data.token;
    })();

    // CAN GET MY OWN INFO
    await (async () => {
      const headers = { authorization: "Bearer " + token };
      const me = await api.get("/me", { headers });
      expect(me).toSucceed();
      expect(me.data.email).toEqual(EMAIL);

      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([token]);
    })();

    // LOGOUT TEST
    await (async () => {
      const headers = { authorization: "Bearer " + token };
      const logout = await api.post("/auth/logout", {}, { headers });
      expect(logout).toSucceed();
      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([]);
    })();

    // LOGIN FOR THE FIRST TIME
    token = await (async () => {
      const login = await api.post("/auth/login/email", CREDENTIALS);
      expect(login).toSucceed();
      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([login.data.token]);
      return login.data.token;
    })();

    // CAN GET MY OWN INFO
    await (async () => {
      const headers = { authorization: "Bearer " + token };
      const me = await api.get("/me", { headers });
      expect(me).toSucceed();
      expect(me.data.email).toEqual(EMAIL);
    })();

    // UPDATE PASSWORD
    await (async () => {
      const headers = { authorization: "Bearer " + token };
      const body = { previous: PASS, updated: "22222222" };
      const update = await api.put("/auth/password/email", body, { headers });
      expect(update).toSucceed();
      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([token]);
    })();

    // LOGOUT AGAIN
    await (async () => {
      const headers = { authorization: "Bearer " + token };
      const logout = await api.post("/auth/logout", {}, { headers });
      expect(logout).toSucceed();
      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([]);
    })();

    // LOGIN WITH OLD PASSWORD
    await (async () => {
      const login = await api.post("/auth/login/email", CREDENTIALS);
      expect(login).not.toSucceed();
      expect(await users()).toEqual(["abc@test.com"]);
    })();

    // LOGIN WITH NEW PASSWORD
    token = await (async () => {
      const login = await api.post("/auth/login/email", {
        ...CREDENTIALS,
        password: "22222222",
      });
      expect(login).toSucceed();
      expect(await users()).toEqual(["abc@test.com"]);
      expect(await sessions()).toEqual([login.data.token]);
      return login.data.token;
    })();
  });
});
