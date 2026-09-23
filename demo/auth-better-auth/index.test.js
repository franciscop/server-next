import app from "./index.js";

describe("Better Auth", () => {
  const account = { name: "Ada", email: "ada@example.com", password: "a-long-password" };

  it("is anonymous without a session", async () => {
    const api = app.test();
    expect(await (await api.get("/")).text()).toBe("Anonymous");
    expect((await api.get("/me")).status).toBe(401);
  });

  it("signs up through its own routes and fills ctx.user", async () => {
    const api = app.test();
    const res = await api.post("/api/auth/sign-up/email", account);
    expect(res.status).toBe(200);

    const me = await api.get("/me");
    expect(me.status).toBe(200);
    expect((await me.json()).email).toBe(account.email);
    expect(await (await api.get("/")).text()).toBe("Hi Ada");
  });

  it("signs in and out again", async () => {
    const api = app.test();
    const res = await api.post("/api/auth/sign-in/email", {
      email: account.email,
      password: account.password,
    });
    expect(res.status).toBe(200);
    expect((await api.get("/me")).status).toBe(200);

    await api.post("/api/auth/sign-out");
    expect((await api.get("/me")).status).toBe(401);
  });

  it("refuses a wrong password", async () => {
    const api = app.test();
    const res = await api.post("/api/auth/sign-in/email", {
      email: account.email,
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
    expect((await api.get("/me")).status).toBe(401);
  });
});
