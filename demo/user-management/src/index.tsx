import server, { type AuthOption, type Context } from "../../..";
import { sessions, users } from "./db.ts";
import Docs from "./Docs.tsx";
import Home from "./Home.tsx";
import {
  NewUser,
  Pagination,
  PublicUser,
  UserList,
  UserPatch,
  type User,
} from "./schemas.ts";

// A fully-fledged user management app: GitHub login, users and sessions in a
// real SQLite database, a validated management API, its OpenAPI spec, and a
// docs UI. See the readme for setup, then `npm run dev`.

// Guards: auth only loads ctx.user, so routes protect themselves
const requireUser = (ctx: Context<{ user: User }>) => {
  if (!ctx.user) return 401;
};
const requireAdmin = (ctx: Context<{ user: User }>) => {
  if (!ctx.user) return 401;
  if (ctx.user.role !== "admin") return 403;
};

const auth: AuthOption = {
  strategy: "cookie",
  providers: ["github"],
  users,
  redirect: "/",
  // Default the role by email; the stored record (UI promotions) wins
  onLogin: (user, existing) => ({
    role: user.email === env.ADMIN_EMAIL ? "admin" : "member",
    ...existing,
    ...user,
  }),
};

export default server<{ user: User }>({
  sessions,
  auth,
  public: `./public`,
  openapi: { title: "User management API" },
})
  // ============ Pages ============
  .get("/", { schema: false }, async (ctx) => {
    const everyone = ctx.user?.role === "admin" ? await users.list({}) : [];
    return <Home user={ctx.user} everyone={everyone} />;
  })
  .get("/docs", { schema: false }, () => <Docs />)

  // ============ User API ============
  .get("/api/me", { response: PublicUser }, requireUser, (ctx) => ctx.user)

  // ============ Admin API ============
  .get(
    "/api/users",
    { query: Pagination, response: UserList },
    requireAdmin,
    (ctx) => users.list(ctx.url.query),
  )
  .post(
    "/api/users",
    { body: NewUser, response: PublicUser },
    requireAdmin,
    async (ctx) => {
      const id = await users.add(ctx.body);
      return users.get<User>(id);
    },
  )
  .get(
    "/api/users/:id",
    { response: PublicUser },
    requireAdmin,
    async (ctx) => {
      const user = await users.get<User>(ctx.url.params.id);
      return user ?? 404;
    },
  )
  .put(
    "/api/users/:id",
    { body: UserPatch, response: PublicUser },
    requireAdmin,
    async (ctx) => {
      const stored = await users.get<User>(ctx.url.params.id);
      if (!stored) return 404;
      const updated = { ...stored, ...ctx.body };
      await users.set(ctx.url.params.id, updated);
      return updated;
    },
  )
  .delete("/api/users/:id", requireAdmin, async (ctx) => {
    await users.del(ctx.url.params.id);
    return 204;
  });
