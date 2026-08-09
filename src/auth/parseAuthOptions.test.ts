import kv from "polystore";

import parseAuthOptions from "./parseAuthOptions";

describe("parseAuthOptions", () => {
  it("returns null when auth is not provided", () => {
    const result = parseAuthOptions(undefined);
    expect(result).toBeNull();
  });

  it("parses string format 'strategy:provider'", () => {
    const result = parseAuthOptions("cookie:email");
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.providers).toEqual(["email"]);
  });

  it("parses object format with a single provider", () => {
    const result = parseAuthOptions({ strategy: "cookie", providers: "email" });
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.providers).toEqual(["email"]);
  });

  it("parses object format with a providers array", () => {
    const result = parseAuthOptions({
      strategy: "token",
      providers: ["email", "github"],
    });
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("token");
    expect(result?.providers).toEqual(["email", "github"]);
  });

  it("throws error when strategy is missing", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ providers: "email" });
    }).toThrow("Auth options needs a strategy");
  });

  it("throws error when strategy is empty", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ strategy: "", providers: "email" });
    }).toThrow("Auth options needs a strategy");
  });

  it("throws error when provider is missing", () => {
    expect(() => {
      parseAuthOptions({ strategy: "cookie" });
    }).toThrow("Auth options needs a provider");
  });

  it("throws error when provider is invalid", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions("cookie:invalid");
    }).toThrow('Provider "invalid" not found');
  });

  it("uses auth.users when provided", async () => {
    const userMap = new Map();
    const result = parseAuthOptions({
      strategy: "cookie",
      providers: "email",
      users: kv(userMap),
    });
    await result?.users.set("alice", { id: 1 });
    expect([...userMap.keys()]).toContain("alice");
  });

  it("accepts a raw Map as auth.users", async () => {
    const userMap = new Map();
    const result = parseAuthOptions({
      strategy: "cookie",
      providers: "email",
      users: userMap,
    });
    await result?.users.set("alice", { id: 1 });
    expect([...userMap.keys()]).toContain("alice");
  });

  it("leaves users unset without one (config fills or rejects it)", () => {
    const result = parseAuthOptions("cookie:email");
    expect(result?.users).toBeNull();
  });

  it("uses custom redirect when provided", () => {
    const result = parseAuthOptions({
      strategy: "cookie",
      providers: "email",
      redirect: "/dashboard",
    });
    expect(result?.redirect).toBe("/dashboard");
  });

  it("uses default redirect '/user' when not provided", () => {
    const result = parseAuthOptions("cookie:email");
    expect(result?.redirect).toBe("/user");
  });

  it("uses a custom onUser when provided", () => {
    const custom = <T>(user: T) => user;
    const result = parseAuthOptions({
      strategy: "cookie",
      providers: "email",
      onUser: custom,
    });
    expect(result?.onUser).toBe(custom);
  });

  it("the default onUser removes the password", () => {
    const result = parseAuthOptions("cookie:email");
    const exposed = result?.onUser(
      { id: 1, email: "test@test.com", password: "secret" } as any,
      {} as any,
    );
    // onUser is typed as returning the user as-is, but it strips the password
    expect(exposed as unknown).toEqual({ id: 1, email: "test@test.com" });
    expect(exposed).not.toHaveProperty("password");
  });
});
