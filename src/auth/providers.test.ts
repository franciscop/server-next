import kv from "polystore";
import server from "..";

// OAuth providers validate their <NAME>_ID/<NAME>_SECRET at server construction
Object.assign(globalThis.env, {
  GOOGLE_ID: "gid",
  GOOGLE_SECRET: "gsecret",
  MICROSOFT_ID: "mid",
  MICROSOFT_SECRET: "msecret",
  DISCORD_ID: "did",
  DISCORD_SECRET: "dsecret",
  FACEBOOK_ID: "fid",
  FACEBOOK_SECRET: "fsecret",
});

// Swap global fetch for a handler keyed on the request URL; returns a restore fn
function mockFetch(handler: (url: string, opts: any) => any) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: any, opts: any) => {
    const out = await handler(String(url), opts);
    return out instanceof Response
      ? out
      : new Response(JSON.stringify(out), {
          headers: { "content-type": "application/json" },
        });
  }) as any;
  return () => {
    globalThis.fetch = real;
  };
}

describe("oauth login redirects", () => {
  const store = kv(new Map());
  const cases = [
    { name: "google", id: "gid", host: "accounts.google.com", scope: "openid" },
    {
      name: "microsoft",
      id: "mid",
      host: "login.microsoftonline.com",
      scope: "User.Read",
    },
    { name: "discord", id: "did", host: "discord.com", scope: "identify" },
    { name: "facebook", id: "fid", host: "facebook.com", scope: "public_profile" },
  ];

  for (const p of cases) {
    it(`${p.name} redirects to its authorize URL`, async () => {
      const api = server({ store, auth: `cookie:${p.name}` as any }).test();
      const res = await api.get(`/auth/login/${p.name}`);
      expect(res.status).toBe(302);

      const url = new URL(res.headers.get("location") as string);
      expect(url.href).toContain(p.host);
      expect(url.searchParams.get("client_id")).toBe(p.id);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("redirect_uri")).toContain(
        `/auth/callback/${p.name}`,
      );
      expect(url.searchParams.get("scope")).toContain(p.scope);

      // CSRF state: present in the URL and bound to a cookie
      const state = url.searchParams.get("state");
      expect(state).toBeTruthy();
      expect(res.headers.get("set-cookie")).toContain(`oauth_state=${state}`);
    });
  }
});

describe("oauth callbacks map profiles and create sessions", () => {
  const CALLBACKS: {
    name: string;
    tokenUrl: string;
    profileUrl: string;
    profile: any;
    expect: { id: string; email: string; name: string; picture?: string };
  }[] = [
    {
      name: "google",
      tokenUrl: "oauth2.googleapis.com/token",
      profileUrl: "openidconnect.googleapis.com/v1/userinfo",
      profile: { sub: "g-1", email: "g@x.com", name: "Gee", picture: "g.png" },
      expect: { id: "g-1", email: "g@x.com", name: "Gee", picture: "g.png" },
    },
    {
      name: "microsoft",
      tokenUrl: "login.microsoftonline.com/common/oauth2/v2.0/token",
      profileUrl: "graph.microsoft.com/v1.0/me",
      // personal accounts have no `mail`, only `userPrincipalName`
      profile: { id: "m-1", userPrincipalName: "m@x.com", displayName: "Em" },
      expect: { id: "m-1", email: "m@x.com", name: "Em" },
    },
    {
      name: "discord",
      tokenUrl: "discord.com/api/oauth2/token",
      profileUrl: "discord.com/api/users/@me",
      profile: {
        id: "d-1",
        email: "d@x.com",
        username: "dee",
        global_name: "Dee",
        avatar: "av",
      },
      expect: {
        id: "d-1",
        email: "d@x.com",
        name: "Dee",
        picture: "cdn.discordapp.com/avatars/d-1/av.png",
      },
    },
    {
      name: "facebook",
      tokenUrl: "graph.facebook.com/v18.0/oauth/access_token",
      profileUrl: "graph.facebook.com/me",
      profile: {
        id: "f-1",
        email: "f@x.com",
        name: "Eff",
        picture: { data: { url: "f.png" } },
      },
      expect: { id: "f-1", email: "f@x.com", name: "Eff", picture: "f.png" },
    },
  ];

  for (const c of CALLBACKS) {
    it(`${c.name} stores the normalized user and sets a cookie`, async () => {
      const store = kv(new Map());
      const restore = mockFetch((url) => {
        if (url.includes(c.tokenUrl)) return { access_token: "tok" };
        if (url.includes(c.profileUrl)) return c.profile;
        throw new Error(`unexpected fetch: ${url}`);
      });
      try {
        const api = server({
          store,
          auth: `cookie:${c.name}` as any,
        }).test();
        const res = await api.get(`/auth/callback/${c.name}?code=abc&state=st`, {
          headers: { cookie: "oauth_state=st" },
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("set-cookie")).toContain("authentication=");

        const user = await store.get<any>(`user:${c.expect.id}`);
        expect(user.email).toBe(c.expect.email);
        expect(user.name).toBe(c.expect.name);
        if (c.expect.picture) expect(user.picture).toContain(c.expect.picture);
      } finally {
        restore();
      }
    });
  }
});

describe("oauth callback (token strategy)", () => {
  it("returns a token in the body instead of a cookie", async () => {
    const store = kv(new Map());
    const restore = mockFetch((url) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return { access_token: "tok" };
      }
      if (url.includes("userinfo")) {
        return { sub: "g-2", email: "t@x.com", name: "Tok" };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    try {
      const api = server({ store, auth: "token:google" }).test();
      const res = await api.get("/auth/callback/google?code=abc&state=st", {
        headers: { cookie: "oauth_state=st" },
      });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.token).toBeTruthy();
      expect(body.email).toBe("t@x.com");
    } finally {
      restore();
    }
  });
});

describe("oauth state (CSRF)", () => {
  it("rejects a callback whose state doesn't match the cookie", async () => {
    const store = kv(new Map());
    const api = server({ store, auth: "cookie:google" }).test();
    const res = await api.get("/auth/callback/google?code=abc&state=st", {
      headers: { cookie: "oauth_state=different" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects a callback with no state at all", async () => {
    const store = kv(new Map());
    const api = server({ store, auth: "cookie:google" }).test();
    const res = await api.get("/auth/callback/google?code=abc");
    expect(res.status).toBe(403);
  });
});

describe("apple", () => {
  const b64url = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  beforeAll(async () => {
    // A real P-256 key so the ES256 client-secret signing actually runs
    const pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
    const bin = String.fromCharCode(...new Uint8Array(pkcs8));
    Object.assign(globalThis.env, {
      APPLE_ID: "com.example.app",
      APPLE_TEAM_ID: "TEAM123",
      APPLE_KEY_ID: "KEY123",
      APPLE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${btoa(bin)}\n-----END PRIVATE KEY-----`,
    });
  });

  it("login redirects with form_post and the name+email scope", async () => {
    const store = kv(new Map());
    const api = server({ store, auth: "cookie:apple" }).test();
    const res = await api.get("/auth/login/apple");
    expect(res.status).toBe(302);

    const url = new URL(res.headers.get("location") as string);
    expect(url.href).toContain("appleid.apple.com/auth/authorize");
    expect(url.searchParams.get("client_id")).toBe("com.example.app");
    expect(url.searchParams.get("response_mode")).toBe("form_post");
    expect(url.searchParams.get("scope")).toBe("name email");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(res.headers.get("set-cookie")).toContain("oauth_state=");
  });

  it("callback signs the secret, decodes the id_token, stores the user", async () => {
    const store = kv(new Map());
    const idToken = `${b64url({ alg: "RS256" })}.${b64url({
      sub: "a-1",
      email: "tim@icloud.com",
    })}.sig`;
    const restore = mockFetch((url) => {
      if (url.includes("appleid.apple.com/auth/token")) {
        return { id_token: idToken };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    try {
      const api = server({ store, auth: "cookie:apple" }).test();
      const res = await api.post(
        "/auth/callback/apple",
        {
          code: "abc",
          state: "st",
          user: JSON.stringify({ name: { firstName: "Tim", lastName: "A" } }),
        },
        { headers: { cookie: "oauth_state=st" } },
      );
      expect(res.status).toBe(302);
      expect(res.headers.get("set-cookie")).toContain("authentication=");

      const user = await store.get<any>("user:a-1");
      expect(user.email).toBe("tim@icloud.com");
      expect(user.name).toBe("Tim A");
    } finally {
      restore();
    }
  });
});
