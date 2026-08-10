// End-to-end tests over the real app: the SQLite file, the guards, the
// validation and the spec. Run with `bun test` (here or from the repo root).
import { kv } from "../..";

// The OAuth provider validates its env vars at construction
Object.assign(process.env, {
  GITHUB_ID: "test-id",
  GITHUB_SECRET: "test-secret",
  SECRET: "test-secret-long",
});
Object.assign(globalThis.env ?? {}, process.env);

const { default: app } = await import("./index.jsx");
const { db, sessions, users } = await import("./db.js");
const api = app.test();

// The server captured its settings at construction; don't leak the fake
// SECRET into other test files sharing this process
delete process.env.SECRET;
delete globalThis.env.SECRET;

// A signed-in browser is just a session record + its cookie
const ADMIN = "REqA2l022l8Q0tuI";
const MEMBER = "REqA2l022l8Q0tuJ";
const as = (id) => ({ headers: { cookie: `session=${id}` } });

beforeAll(async () => {
  db.run("DELETE FROM users");
  db.run("DELETE FROM sessions");
  const u = kv(users);
  const s = kv(sessions);
  await u.set("g1", { id: "g1", name: "Ada", email: "ada@x.com", role: "admin", provider: "github", strategy: "cookie" });
  await u.set("g2", { id: "g2", name: "Bob", email: "bob@x.com", role: "member", provider: "github", strategy: "cookie" });
  await s.set(ADMIN, { user: "g1", provider: "github", created: "2026-08-10" });
  await s.set(MEMBER, { user: "g2", provider: "github", created: "2026-08-10" });
});

afterAll(() => {
  db.run("DELETE FROM users");
  db.run("DELETE FROM sessions");
});

describe("pages", () => {
  it("shows the login link to guests", async () => {
    const res = await api.get("/");
    expect(await res.text()).toContain("Sign in with GitHub");
  });

  it("shows the user table to the admin", async () => {
    const res = await api.get("/", as(ADMIN));
    const html = await res.text();
    expect(html).toContain("Hi Ada");
    expect(html).toContain("bob@x.com");
  });

  it("hides the table from members", async () => {
    const html = await (await api.get("/", as(MEMBER))).text();
    expect(html).toContain("Hi Bob");
    expect(html).not.toContain("ada@x.com");
  });
});

describe("management API", () => {
  it("requires a user", async () => {
    expect((await api.get("/api/me")).status).toBe(401);
    expect((await api.get("/api/users")).status).toBe(401);
  });

  it("resolves the signed-in user from SQLite", async () => {
    const me = await (await api.get("/api/me", as(ADMIN))).json();
    expect(me.email).toBe("ada@x.com");
    expect(me.role).toBe("admin");
  });

  it("lists and searches users (admin only)", async () => {
    const all = await (await api.get("/api/users", as(ADMIN))).json();
    expect(all.map((u) => u.email).sort()).toEqual(["ada@x.com", "bob@x.com"]);

    const found = await (await api.get("/api/users?search=bob", as(ADMIN))).json();
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("Bob");

    expect((await api.get("/api/users", as(MEMBER))).status).toBe(403);
  });

  it("members rename themselves, and only themselves", async () => {
    const ok = await api.put("/api/users/g2", { name: "Bobby" }, as(MEMBER));
    expect((await ok.json()).name).toBe("Bobby");

    expect((await api.put("/api/users/g1", { name: "Nope" }, as(MEMBER))).status).toBe(403);
    expect((await api.put("/api/users/g2", { role: "admin" }, as(MEMBER))).status).toBe(403);
  });

  it("admins change roles; the schema rejects invented ones", async () => {
    const promoted = await api.put("/api/users/g2", { role: "admin" }, as(ADMIN));
    expect((await promoted.json()).role).toBe("admin");

    const invalid = await api.put("/api/users/g2", { role: "emperor" }, as(ADMIN));
    expect(invalid.status).toBe(422);
  });

  it("validates the query too", async () => {
    expect((await api.get("/api/users?page=zero", as(ADMIN))).status).toBe(422);
  });

  it("admins delete users", async () => {
    expect((await api.delete("/api/users/g2", as(ADMIN))).status).toBe(204);
    expect((await api.get("/api/users/g2", as(ADMIN))).status).toBe(404);
  });
});

describe("spec and docs", () => {
  it("serves the OpenAPI spec built from the routes", async () => {
    const spec = await (await api.get("/openapi.json")).json();
    expect(spec.info.title).toBe("User management API");
    expect(spec.paths["/api/users/{id}"].put.requestBody).toBeDefined();
    expect(spec.paths["/api/users"].get.parameters).toContainEqual({
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
    });
  });

  it("serves the docs UI pointing at the spec", async () => {
    const html = await (await api.get("/docs")).text();
    expect(html).toContain('data-url="/openapi.json"');
  });
});
