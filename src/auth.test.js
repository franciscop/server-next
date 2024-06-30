import kv from "polystore";

import server from "./index.js";

describe("auth", () => {
  const store = kv(new Map());
  const api = server({ store })
    .get("/", (ctx) => ctx.headers.authorization)
    .test();

  it("should be Bearer", async () => {
    const authorization = "Basic REqA2l022l8Q0tuIRtqLOPUy";
    const { data } = await api.get("/", { headers: { authorization } });
    expect(data).toBe("Invalid Authorization type, 'Basic'");
  });

  it("should have the proper token", async () => {
    const authorization = "Bearer hola";
    const { data } = await api.get("/", { headers: { authorization } });
    expect(data).toBe("Invalid Authorization token");
  });

  it("can get the nested get", async () => {
    const authorization = "Bearer REqA2l022l8Q0tuIRtqLOPUy";
    const { data } = await api.get("/", { headers: { authorization } });
    expect(data).toBe("Bearer REqA2l022l8Q0tuIRtqLOPUy");
  });
});

describe("user creation flow", () => {
  // These are obviously mock data
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const store = kv(new Map());
  const auth = { type: "token", providers: "email" };
  const api = server({ auth, store }).test();

  it("can create a new user", async () => {
    const register = await api.post("/auth/register/email", CREDENTIALS);
    expect(register.status).toBe(201);
    expect(await store.keys()).toEqual([
      "auth:abc@test.com",
      "session:" + register.data.token,
    ]);

    const authorization = "Bearer " + register.data.token;
    const headers = { authorization };
    const logout = await api.post("/auth/logout", {}, { headers });

    expect(logout.status).toBe(200);
    expect(await store.keys()).toEqual(["auth:abc@test.com"]);

    const login = await api.post("/auth/login/email", CREDENTIALS);
    expect(login.status).toBe(200);
    expect(await store.keys()).toEqual([
      "auth:abc@test.com",
      "session:" + login.data.token,
    ]);
  });
});
