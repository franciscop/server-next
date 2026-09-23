import server, { type AuthOption, type Context } from "../../..";
import { users } from "./db.ts";
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

// A fully-fledged user management app: GitHub login, users in a
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
  providers: "github",
  redirect: "/",
  // The only two places auth touches the database: store whoever logged in and
  // return the id the cookie points at, then resolve it on every request.
  onLogin: (profile) => users.upsert(profile).id,
  getUser: (id) => users.find(id),
};

export default server<{ user: User }>({
  auth,
  public: `./public`,
  openapi: { title: "User management API" },
})
  // ============ Pages ============
  .get("/", { schema: false }, async (ctx) => {
    const everyone = ctx.user?.role === "admin" ? users.list({}) : [];
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
      const { id } = users.upsert({
        id: crypto.randomUUID(),
        provider: "manual",
        ...ctx.body,
      });
      return users.find(id);
    },
  )
  .get(
    "/api/users/:id",
    { response: PublicUser },
    requireAdmin,
    async (ctx) => {
      return users.find(ctx.url.params.id) ?? 404;
    },
  )
  .put(
    "/api/users/:id",
    { body: UserPatch, response: PublicUser },
    requireAdmin,
    async (ctx) => {
      if (!users.find(ctx.url.params.id)) return 404;
      users.update(ctx.url.params.id, ctx.body);
      return users.find(ctx.url.params.id);
    },
  )
  .delete("/api/users/:id", requireAdmin, (ctx) => {
    users.del(ctx.url.params.id);
    return 204;
  });
