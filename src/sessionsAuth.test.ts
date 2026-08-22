import kv from "polystore";
import server from ".";

const CREDENTIALS = { email: "abc@test.com", password: "11111111" };

// Run a block with NODE_ENV=production. `globalThis.env` is the snapshot the
// boot guards read; `process.env` is what ctx.platform.production reads live.
const inProduction = async (fn: () => unknown) => {
  const before = globalThis.env.NODE_ENV;
  const processBefore = process.env.NODE_ENV;
  globalThis.env.NODE_ENV = "production";
  process.env.NODE_ENV = "production";
  try {
    await fn();
  } finally {
    globalThis.env.NODE_ENV = before;
    if (processBefore === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = processBefore;
  }
};

describe("production boot guard", () => {
  it("requires an explicit users store with auth", async () => {
    await inProduction(() => {
      expect(() => server({ auth: "cookie:email" })).toThrow(/users/);
    });
  });

  it("requires an explicit sessions store with auth", async () => {
    await inProduction(() => {
      expect(() =>
        server({
          auth: { strategy: "cookie", providers: "email", users: new Map() },
        }),
      ).toThrow(/sessions/);
    });
  });

  it("boots with both stores set (even explicit Maps)", async () => {
    await inProduction(() => {
      const app = server({
        auth: {
          strategy: "cookie",
          providers: "email",
          users: new Map(),
          sessions: new Map(),
        },
      });
      expect(app).toBeDefined();
    });
  });

  it("jwt still requires users (logins read and write it), not sessions", async () => {
    await inProduction(() => {
      // No `sessions` needed: jwt stores no login record
      const app = server({
        secrets: "s3cret",
        auth: { strategy: "jwt", providers: "email", users: new Map() },
      });
      expect(app).toBeDefined();
      // But `users` always is: every login does the existing-user upsert
      globalThis.env.GITHUB_ID = "id";
      globalThis.env.GITHUB_SECRET = "secret";
      expect(() => server({ secrets: "s3cret", auth: "jwt:github" })).toThrow(
        /users/,
      );
    });
  });

  it("without auth nothing is stored, so production boots fine", async () => {
    await inProduction(() => {
      expect(server()).toBeDefined();
    });
  });

  it("in development everything defaults", () => {
    expect(server({ auth: "cookie:email" })).toBeDefined();
  });
});

describe("the login record", () => {
  const setup = () => {
    const sessions = kv(new Map());
    return {
      sessions,
      api: server({
        auth: {
          strategy: "cookie",
          providers: ["email"],
          users: new Map(),
          sessions,
        },
      })
        .get("/me", (ctx) => ctx.user || 401)
        .test(),
    };
  };
  const cookieOf = (res: any) =>
    String(res.headers.get("set-cookie")).match(/session=([^;]+)/)?.[1];

  it("stores who logged in, and resolves ctx.user from it", async () => {
    const { sessions, api } = setup();

    const login = await api.post("/auth/register/email", CREDENTIALS);
    const id = cookieOf(login);
    expect(id).toBeTruthy();

    const record = await sessions.get<any>(id as string);
    expect(record.user).toBe(CREDENTIALS.email);
    expect(record.provider).toBe("email");
    expect(record.created).toBeTruthy();

    const me = await api.get("/me", { headers: { cookie: `session=${id}` } });
    expect((await me.json()).email).toBe(CREDENTIALS.email);
  });

  it("rotates the id on login, dropping the previous record", async () => {
    const { sessions, api } = setup();

    const first = cookieOf(await api.post("/auth/register/email", CREDENTIALS));
    const second = cookieOf(
      await api.post("/auth/login/email", CREDENTIALS, {
        headers: { cookie: `session=${first}` },
      }),
    );

    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect(await sessions.get(first as string)).toBeNull();
  });

  it("logout deletes the record", async () => {
    const sessions = kv(new Map());
    const api = server({
      auth: {
        strategy: "token",
        providers: ["email"],
        users: new Map(),
        sessions,
      },
    }).test();

    const login = await api.post("/auth/register/email", CREDENTIALS);
    const { token } = await login.json();
    const headers = { authorization: `Bearer ${token}` };
    expect(await sessions.get(token)).not.toBeNull();

    await api.post("/auth/logout", {}, { headers });
    expect(await sessions.get(token)).toBeNull();
    expect(await sessions.keys()).toEqual([]);
  });

  it("revokes everywhere by sweeping the records of one user", async () => {
    const sessions = kv(new Map());
    const api = server({
      auth: {
        strategy: "token",
        providers: ["email"],
        users: new Map(),
        sessions,
      },
    })
      .get("/me", (ctx) => ctx.user || 401)
      .test();

    // The same person signs in on two "devices"
    const one = await (
      await api.post("/auth/register/email", CREDENTIALS)
    ).json();
    const two = await (await api.post("/auth/login/email", CREDENTIALS)).json();
    expect((await sessions.keys()).length).toBe(2);

    // The force-logout pattern from the docs: end every login of one user
    for (const id of await sessions.keys()) {
      const record = await sessions.get<any>(id);
      if (record?.user === CREDENTIALS.email) await sessions.del(id);
    }

    for (const { token } of [one, two]) {
      const res = await api.get("/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401); // the route's own 401: anonymous again
    }
  });
});

describe("the token strategy is cookie-free", () => {
  const app = () =>
    server({
      auth: {
        strategy: "token",
        providers: ["email"],
        users: new Map(),
        sessions: new Map(),
      },
    })
      .get("/me", (ctx) => ctx.user || 401)
      .test();

  it("never mints a cookie, and ignores one it is sent", async () => {
    const api = app();
    const login = await api.post("/auth/register/email", CREDENTIALS);
    expect(login.headers.get("set-cookie")).toBeNull();
    const { token } = await login.json();

    // The bearer carries the login
    const me = await api.get("/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect((await me.json()).email).toBe(CREDENTIALS.email);

    // The same value in a cookie is not a credential here
    const cookied = await api.get("/me", {
      headers: { cookie: `session=${token}` },
    });
    expect(cookied.status).toBe(401);
  });
});
