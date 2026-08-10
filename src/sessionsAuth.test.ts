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
        sessions: new Map(),
        auth: { strategy: "cookie", providers: "email", users: new Map() },
      });
      expect(app).toBeDefined();
    });
  });

  it("jwt still requires users (logins read and write it), not sessions", async () => {
    await inProduction(() => {
      // No `sessions` needed: jwt has no ctx.session
      const app = server({
        secret: "s3cret",
        auth: { strategy: "jwt", providers: "email", users: new Map() },
      });
      expect(app).toBeDefined();
      // But `users` always is: every login does the existing-user upsert
      globalThis.env.GITHUB_ID = "id";
      globalThis.env.GITHUB_SECRET = "secret";
      expect(() => server({ secret: "s3cret", auth: "jwt:github" })).toThrow(
        /users/,
      );
    });
  });

  it("without auth the defaults boot fine in production", async () => {
    await inProduction(() => {
      expect(server()).toBeDefined();
    });
  });

  it("in development everything defaults", () => {
    expect(server({ auth: "cookie:email" })).toBeDefined();
  });

  it("warns once, on the first write, when sessions default in production", async () => {
    await inProduction(async () => {
      const warns: string[] = [];
      const real = console.warn;
      console.warn = (msg: string) => warns.push(msg);
      try {
        const api = server()
          .get("/idle", () => "ok")
          .post("/hit", (ctx) => {
            ctx.session.n = Number(ctx.session.n ?? 0) + 1;
            return 200;
          })
          .test();

        // A request that never touches the session says nothing
        await api.get("/idle");
        expect(warns).toHaveLength(0);

        // The first write warns, later ones stay quiet
        await api.post("/hit", {});
        await api.post("/hit", {});
        expect(warns).toHaveLength(1);
        expect(warns[0]).toContain("in-memory session store");
      } finally {
        console.warn = real;
      }
    });
  });
});

describe("login and the session record", () => {
  const setup = () => {
    const sessions = kv(new Map());
    return {
      sessions,
      api: server({
        sessions,
        auth: { strategy: "cookie", providers: ["email"], users: new Map() },
      })
        .post("/cart", (ctx) => {
          ctx.session.cart = ["book-1"];
          return 200;
        })
        .get("/session", (ctx) => ctx.session)
        .test(),
    };
  };
  const cookieOf = (res: any) =>
    String(res.headers.get("set-cookie")).match(/session=([^;]+)/)?.[1];

  it("rotates the session id and carries the guest data over", async () => {
    const { sessions, api } = setup();

    // A guest session first
    const guest = await api.post("/cart", {});
    const guestId = cookieOf(guest);
    expect(guestId).toBeTruthy();

    // Logging in rotates the id: new cookie, old record gone, data kept
    const login = await api.post("/auth/register/email", CREDENTIALS, {
      headers: { cookie: `session=${guestId}` },
    });
    const loggedId = cookieOf(login);
    expect(loggedId).toBeTruthy();
    expect(loggedId).not.toBe(guestId);
    expect(await sessions.get(guestId as string)).toBeNull();

    // One flat record: the reserved auth fields next to the app's own
    const record = await sessions.get<any>(loggedId as string);
    expect(record.cart).toEqual(["book-1"]);
    expect(record.user).toBe(CREDENTIALS.email);
    expect(record.provider).toBe("email");
    expect(record.created).toBeTruthy();

    // And ctx.session carries the same fields on later requests
    const session = await api.get("/session", {
      headers: { cookie: `session=${loggedId}` },
    });
    expect((await session.json()).user).toBe(CREDENTIALS.email);
  });

  it("onLogin can stamp per-device details onto the session", async () => {
    const sessions = kv(new Map());
    const api = server({
      sessions,
      auth: {
        strategy: "token",
        providers: ["email"],
        users: new Map(),
        onLogin: (user: any, existing: any, ctx: any) => {
          ctx.session.agent = ctx.headers["user-agent"];
          return { ...(existing ?? {}), ...user };
        },
      },
    }).test();

    const login = await api.post("/auth/register/email", CREDENTIALS, {
      headers: { "user-agent": "test-browser" },
    });
    const { token } = await login.json();
    const record = await sessions.get<any>(token);
    expect(record.agent).toBe("test-browser");
    expect(record.user).toBe(CREDENTIALS.email); // auth fields still stamped
  });

  it("logout deletes the whole record, app data included", async () => {
    const sessions = kv(new Map());
    const api = server({
      sessions,
      auth: { strategy: "token", providers: ["email"], users: new Map() },
    })
      .post("/cart", (ctx) => {
        ctx.session.cart = ["book-1"];
        return 200;
      })
      .test();

    const login = await api.post("/auth/register/email", CREDENTIALS);
    const { token } = await login.json();
    const headers = { authorization: `Bearer ${token}` };

    await api.post("/cart", {}, { headers });
    expect((await sessions.get<any>(token)).cart).toEqual(["book-1"]);

    await api.post("/auth/logout", {}, { headers });
    expect(await sessions.get(token)).toBeNull();
    expect(await sessions.keys()).toEqual([]);
  });

  it("revokes everywhere by sweeping sessions on their user", async () => {
    const sessions = kv(new Map());
    const api = server({
      sessions,
      auth: { strategy: "token", providers: ["email"], users: new Map() },
    })
      .get("/me", (ctx) => ctx.user || 401)
      .test();

    // The same person signs in on two "devices"
    const one = await (
      await api.post("/auth/register/email", CREDENTIALS)
    ).json();
    const two = await (await api.post("/auth/login/email", CREDENTIALS)).json();
    expect((await sessions.keys()).length).toBe(2);

    // The force-logout pattern from the docs: end every session of one user
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
      auth: { strategy: "token", providers: ["email"], users: new Map() },
    })
      .get("/read", (ctx) => `got ${ctx.session.cart}`)
      .post("/write", (ctx) => {
        ctx.session.cart = ["x"];
        return 200;
      })
      .get("/ok", () => "no session touched")
      .test();

  it("a guest has no session at all: any access throws", async () => {
    const api = app();
    const read = await api.get("/read");
    expect(read.status).toBe(500);
    expect(await read.text()).toContain("Authorization header");

    const write = await api.post("/write", {});
    expect(write.status).toBe(500);

    // Routes that leave ctx.session alone are unaffected, and cookie-free
    const ok = await api.get("/ok");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toBeNull();
  });

  it("never mints a cookie, and ignores one it is sent", async () => {
    const api = app();
    const login = await api.post("/auth/register/email", CREDENTIALS);
    expect(login.headers.get("set-cookie")).toBeNull();
    const { token } = await login.json();

    // The bearer carries the session; writes persist with no Set-Cookie
    const headers = { authorization: `Bearer ${token}` };
    const write = await api.post("/write", {}, { headers });
    expect(write.headers.get("set-cookie")).toBeNull();
    const read = await api.get("/read", { headers });
    expect(await read.text()).toBe("got x");

    // A stray cookie is not a credential here: still a session-less guest
    const cookied = await api.get("/read", {
      headers: { cookie: `session=${token}` },
    });
    expect(cookied.status).toBe(500);
  });
});

describe("session writes are dirty-checked", () => {
  it("a read-only request does not hit the store", async () => {
    let writes = 0;
    const map = new Map();
    const base = kv(map);
    // A minimal custom store: the documented get/set/has/del/keys/prefix shape
    const counting = {
      prefix: () => counting,
      get: (k: string) => base.get(k),
      set: (k: string, v: any) => {
        writes++;
        return base.set(k, v);
      },
      has: (k: string) => base.has(k),
      del: (k: string) => base.del(k),
      keys: () => base.keys(),
    };

    const api = server({ sessions: counting as any })
      .post("/write", (ctx) => {
        ctx.session.n = 1;
        return 200;
      })
      .get("/read", (ctx) => ctx.session.n ?? null)
      .test();

    const res = await api.post("/write", {});
    expect(writes).toBe(1);

    // Reading the session back writes nothing
    const cookie = String(res.headers.get("set-cookie")).split(";")[0];
    await api.get("/read", { headers: { cookie } });
    await api.get("/read", { headers: { cookie } });
    expect(writes).toBe(1);

    // Writing the same value again is not a change either
    await api.post("/write", {}, { headers: { cookie } });
    expect(writes).toBe(1);
  });
});
