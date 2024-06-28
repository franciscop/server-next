import kv from "polystore";

import server from "./index.js";

const url = (token) =>
  new Request("http://localhost:3000/", {
    headers: { authorization: token },
  });

describe("auth", () => {
  const store = kv(new Map());
  const app = server({ store }).get("/", (ctx) => {
    return ctx.headers.authorization;
  });

  it("should be Bearer", async () => {
    const res = await app.fetch(url("Basic REqA2l022l8Q0tuIRtqLOPUy"));
    expect(await res.text()).toBe("Invalid Authorization type, 'Basic'");
  });

  it("should have the proper token", async () => {
    const res = await app.fetch(url("Bearer hola"));
    expect(await res.text()).toBe("Invalid Authorization token");
  });

  it("can get the nested get", async () => {
    const res = await app.fetch(url("Bearer REqA2l022l8Q0tuIRtqLOPUy"));
    expect(await res.text()).toBe("Bearer REqA2l022l8Q0tuIRtqLOPUy");
  });

  describe("user creation flow", () => {
    // These are obviously mock data
    const EMAIL = "abc@test.com";
    const PASS = "11111111";

    const url = (path, body = {}, headers = {}) =>
      new Request("http://localhost:3000" + path, {
        headers: {
          cookie: "session=REqA2l022l8Q0tuIRtqLOPUy",
          "content-type": "application/json",
          ...headers,
        },
        method: "POST",
        body: JSON.stringify(body),
      });

    const store = kv(new Map());
    const app = server({ auth: { type: "token", providers: "email" }, store });

    it("can create a new user", async () => {
      const regReq = await app.fetch(
        url("/auth/register/email", { email: EMAIL, password: PASS })
      );
      const register = await regReq.json();
      expect(regReq.status).toBe(201);
      expect(await store.keys()).toEqual([
        "auth:abc@test.com",
        "session:" + register.token,
      ]);

      const logoutReq = await app.fetch(
        url("/auth/logout", {}, { authorization: "Bearer " + register.token })
      );
      expect(logoutReq.status).toBe(200);
      expect(await store.keys()).toEqual(["auth:abc@test.com"]);

      const loginReq = await app.fetch(
        url("/auth/login/email", { email: EMAIL, password: PASS })
      );
      const login = await loginReq.json();
      expect(loginReq.status).toBe(200);
      expect(await store.keys()).toEqual([
        "auth:abc@test.com",
        "session:" + login.token,
      ]);
    });
  });
});
