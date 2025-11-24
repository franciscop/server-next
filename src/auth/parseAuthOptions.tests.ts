import "../tests/toSucceed";

import kv from "polystore";

import parseAuthOptions from "./parseAuthOptions";

describe("parseAuthOptions", () => {
  const store = kv(new Map());

  it("returns null when auth is not provided", () => {
    const result = parseAuthOptions(undefined, { store });
    expect(result).toBeNull();
  });

  it("parses string format 'strategy:provider'", () => {
    const result = parseAuthOptions("cookie:email", { store });
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.provider).toEqual(["email"]);
  });

  it("parses string format with multiple providers 'strategy:provider1|provider2'", () => {
    const result = parseAuthOptions("jwt:email|github", { store });
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("jwt");
    expect(result?.provider).toEqual(["email", "github"]);
  });

  it("parses object format with single provider", () => {
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email" },
      { store },
    );
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.provider).toEqual(["email"]);
  });

  it("parses object format with provider array", () => {
    const result = parseAuthOptions(
      { strategy: "jwt", provider: ["email", "github"] },
      { store },
    );
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("jwt");
    expect(result?.provider).toEqual(["email", "github"]);
  });

  it("parses object format with pipe-separated providers", () => {
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email|github" },
      { store },
    );
    expect(result).not.toBeNull();
    expect(result?.strategy).toBe("cookie");
    expect(result?.provider).toEqual(["email", "github"]);
  });

  it("throws error when strategy is missing", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ provider: "email" }, { store });
    }).toThrow("Auth options needs a strategy");
  });

  it("throws error when strategy is empty", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ strategy: "", provider: "email" }, { store });
    }).toThrow("Auth options needs a strategy");
  });

  it("throws error when provider is missing", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions({ strategy: "cookie" }, { store });
    }).toThrow("Auth options needs a provider");
  });

  it("throws error when provider is invalid", () => {
    expect(() => {
      // @ts-expect-error
      parseAuthOptions("cookie:invalid", { store });
    }).toThrow("Invalid providers");
  });

  it("throws error when no store is available", () => {
    expect(() => {
      parseAuthOptions("cookie:email", {});
    }).toThrow("Need a userStore store for Auth");
  });

  it("uses auth.session when provided", () => {
    const sessionStore = kv(new Map());
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email", session: sessionStore },
      { store },
    );
    expect(result?.session).toBe(sessionStore);
  });

  it("creates session store from all.store with 'auth:' prefix", () => {
    const result = parseAuthOptions("cookie:email", { store });
    expect(result?.session.name).toContain("auth:");
  });

  it("uses auth.store when provided", () => {
    const userStore = kv(new Map());
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email", store: userStore },
      { store },
    );
    expect(result?.store).toBe(userStore);
  });

  it("creates user store from all.store with 'user:' prefix", () => {
    const result = parseAuthOptions("cookie:email", { store });
    expect(result?.store.name).toContain("user:");
  });

  it("uses custom redirect when provided", () => {
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email", redirect: "/dashboard" },
      { store },
    );
    expect(result?.redirect).toBe("/dashboard");
  });

  it("uses default redirect '/user' when not provided", () => {
    const result = parseAuthOptions("cookie:email", { store });
    expect(result?.redirect).toBe("/user");
  });

  it("uses custom cleanUser function when provided", () => {
    const customClean = <T>(user: T) => user;
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email", cleanUser: customClean },
      { store },
    );
    expect(result?.cleanUser).toBe(customClean);
  });

  it("uses default cleanUser function that removes password", () => {
    const result = parseAuthOptions("cookie:email", { store });
    const cleanedUser = result?.cleanUser({
      id: 1,
      email: "test@test.com",
      password: "secret",
    });
    expect(cleanedUser).toEqual({ id: 1, email: "test@test.com" });
    expect(cleanedUser).not.toHaveProperty("password");
  });

  it("handles pipe-separated providers in object format", () => {
    const result = parseAuthOptions(
      { strategy: "cookie", provider: "email|github" },
      { store },
    );
    expect(result?.provider).toEqual(["email", "github"]);
  });
});
