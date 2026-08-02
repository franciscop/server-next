import kv from "polystore";

import parseAuthOptions from "./parseAuthOptions";

describe("parseAuthOptions", () => {
  const map = new Map();
  const store = kv(map);

  it("returns null when auth is not provided", () => {
    const result = parseAuthOptions(undefined, { store });
    expect(result).toBeNull();
  });

  it("parses string format 'strategy:provider'", () => {
    const result = parseAuthOptions("cookie:email", { store });
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.providers).toEqual(["email"]);
  });

  it("parses object format with a single provider", () => {
    const result = parseAuthOptions(
      { strategy: "cookie", providers: "email" },
      { store },
    );
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.providers).toEqual(["email"]);
  });

  it("parses object format with a providers array", () => {
    const result = parseAuthOptions(
      { strategy: "token", providers: ["email", "github"] },
      { store },
    );
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("token");
    expect(result?.providers).toEqual(["email", "github"]);
  });

  it("throws error when strategy is missing", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ providers: "email" }, { store });
    }).toThrow("Auth options needs a strategy");
  });

  it("throws error when strategy is empty", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ strategy: "", providers: "email" }, { store });
    }).toThrow("Auth options needs a strategy");
  });

  it("throws error when provider is missing", () => {
    expect(() => {
      parseAuthOptions({ strategy: "cookie" }, { store });
    }).toThrow("Auth options needs a provider");
  });

  it("throws error when provider is invalid", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions("cookie:invalid", { store });
    }).toThrow('Provider "invalid" not found');
  });

  it("throws error when no store is available", () => {
    expect(() => {
      parseAuthOptions("cookie:email", {});
    }).toThrow("Need a userStore store for Auth");
  });

  it("uses auth.session when provided", async () => {
    const sessionMap = new Map();
    const result = parseAuthOptions(
      { strategy: "cookie", providers: "email", session: kv(sessionMap) },
      { store },
    );
    // Writes land in the given store, unprefixed, not in the shared one
    await result?.session.set("token", "x");
    expect([...sessionMap.keys()]).toContain("token");
    expect([...map.keys()]).not.toContain("auth:token");
  });

  it("accepts a raw Map as auth.session", async () => {
    const sessionMap = new Map();
    const result = parseAuthOptions(
      { strategy: "cookie", providers: "email", session: sessionMap },
      { store },
    );
    await result?.session.set("token", "x");
    expect([...sessionMap.keys()]).toContain("token");
  });

  it("creates session store from all.store with 'auth:' prefix", async () => {
    const result = parseAuthOptions("cookie:email", { store });
    await result?.session.set("token", "x");
    expect([...map.keys()]).toContain("auth:token");
  });

  it("uses auth.store when provided", async () => {
    const userMap = new Map();
    const result = parseAuthOptions(
      { strategy: "cookie", providers: "email", store: kv(userMap) },
      { store },
    );
    await result?.store.set("alice", { id: 1 });
    expect([...userMap.keys()]).toContain("alice");
    expect([...map.keys()]).not.toContain("user:alice");
  });

  it("creates user store from all.store with 'user:' prefix", async () => {
    const result = parseAuthOptions("cookie:email", { store });
    await result?.store.set("alice", { id: 1 });
    expect([...map.keys()]).toContain("user:alice");
  });

  it("uses custom redirect when provided", () => {
    const result = parseAuthOptions(
      { strategy: "cookie", providers: "email", redirect: "/dashboard" },
      { store },
    );
    expect(result?.redirect).toBe("/dashboard");
  });

  it("uses default redirect '/user' when not provided", () => {
    const result = parseAuthOptions("cookie:email", { store });
    expect(result?.redirect).toBe("/user");
  });

  it("uses a custom onUser when provided", () => {
    const custom = <T>(user: T) => user;
    const result = parseAuthOptions(
      { strategy: "cookie", providers: "email", onUser: custom },
      { store },
    );
    expect(result?.onUser).toBe(custom);
  });

  it("the default onUser removes the password", () => {
    const result = parseAuthOptions("cookie:email", { store });
    const exposed = result?.onUser(
      { id: 1, email: "test@test.com", password: "secret" } as any,
      {} as any,
    );
    // onUser is typed as returning the user as-is, but it strips the password
    expect(exposed as unknown).toEqual({ id: 1, email: "test@test.com" });
    expect(exposed).not.toHaveProperty("password");
  });
});
