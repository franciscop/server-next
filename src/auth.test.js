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

  describe.skip("user creation flow", () => {
    const url = (path, options = {}) =>
      new Request("http://localhost:3000" + path, {
        headers: {
          cookie: "session=REqA2l022l8Q0tuIRtqLOPUy",
          "content-type": "application/json",
        },
        ...options,
        body: JSON.stringify(options.body),
      });

    const store = kv(new Map());
    const app = server({ auth: "email", store });

    it("can create a new user", async () => {
      const registered = await app.fetch(
        url("/register", {
          method: "POST",
          body: { email: "abc@test.com", password: "11111111" },
        })
      );
      console.log(registered);
      console.log(Object.fromEntries(await store.entries()));
      console.log(await registered.text());
      expect(registered.status).toBe(201);

      const login = await app.fetch(
        url("/login", {
          method: "POST",
          body: { email: "abc@test.com", password: "11111111" },
        })
      );
      console.log(login);
      console.log(Object.fromEntries(await store.entries()));
      console.log(await login.text());
      expect(login.status).toBe(200);
    });
  });
});
