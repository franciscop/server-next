import kv from "polystore";

import server from "..";

describe("user creation flow", () => {
  // These are obviously mock data
  const EMAIL = "abc@test.com";
  const PASS = "11111111";
  const CREDENTIALS = { email: EMAIL, password: PASS };

  const sessionStore = kv(new Map());
  const userStore = kv(new Map());
  const api = server({
    auth: {
      strategy: "cookie",
      providers: ["email"],
      users: userStore,
      sessions: sessionStore,
    },
  })
    .get("/me", (ctx) => ctx.user || "No data")
    .test();

  it.skip("can create a new user", async () => {
    const register = await api.post("/auth/register/email", CREDENTIALS);
    expect(register.status).toBe(200);
    const id = register.headers["set-cookie"].split(";")[0].split("=")[1];
    expect(await userStore.keys()).toEqual([EMAIL]);
    expect(await sessionStore.keys()).toEqual([id]);

    const me = await api.get("/me");
    expect(me.status).toBe(200);
    const body = await me.json();
    expect(body.email).toEqual(EMAIL); // FAILING

    const logout = await api.post("/auth/logout");
    expect(logout.status).toBe(200);
    expect(await sessionStore.keys()).toEqual([]);

    const login = await api.post("/auth/login/email", CREDENTIALS);
    expect(login.status).toBe(200);
    const next = login.headers["set-cookie"].split(";")[0].split("=")[1];
    expect(await sessionStore.keys()).toEqual([next]);
  });
});
