import server from "../..";
import { z } from "zod";
import { countUsers, listUsers, sessions, userRecords, users } from "./db.js";

// A fully-fledged user management app: GitHub login, users and sessions in a
// real SQLite database, a validated management API, its OpenAPI spec, and a
// docs UI. See the readme for setup, then `npm run dev`.

const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
const UserPatch = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "member"]).optional(),
});
const PublicUser = z.object({
  id: z.string(),
  name: z.string().nullish(),
  email: z.string(),
  role: z.enum(["admin", "member"]),
});

// Guards: auth only loads ctx.user, so routes protect themselves
const requireUser = (ctx) => {
  if (!ctx.user) return 401;
};
const requireAdmin = (ctx) => {
  if (!ctx.user) return 401;
  if (ctx.user.role !== "admin") return 403;
};

const Layout = ({ children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>User management</title>
      <style>{`
        body { font-family: system-ui; max-width: 40rem; margin: 2rem auto; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ccc; padding: 0.4rem; text-align: left; }
      `}</style>
    </head>
    <body>{children}</body>
  </html>
);

export default server({
  sessions,
  auth: {
    strategy: "cookie",
    providers: ["github"],
    users,
    redirect: "/",
    // The record to persist: the very first user becomes the admin
    onLogin: (loginUser, existingUser) => ({
      ...(existingUser ?? {}),
      ...loginUser,
      role: existingUser?.role ?? (countUsers() === 0 ? "admin" : "member"),
    }),
  },
  openapi: { title: "User management API" },
})
  // ============ Pages ============
  .get("/", (ctx) => {
    if (!ctx.user) {
      return (
        <Layout>
          <h1>User management</h1>
          <p>
            <a href="/auth/login/github">Sign in with GitHub</a>
          </p>
        </Layout>
      );
    }
    const everyone = ctx.user.role === "admin" ? listUsers({}) : [];
    return (
      <Layout>
        <h1>Hi {ctx.user.name || ctx.user.email}</h1>
        <p>
          Signed in since {ctx.session.created} as <b>{ctx.user.role}</b>.{" "}
          <a href="/docs">API docs</a>
        </p>
        {ctx.user.role === "admin" && (
          <table>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
            {everyone.map((user) => (
              <tr>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </table>
        )}
        <form method="POST" action="/auth/logout">
          <button>Log out</button>
        </form>
      </Layout>
    );
  })

  // ============ Management API ============
  .get("/api/me", requireUser, function currentUser(ctx) {
    return ctx.user;
  })
  .get(
    "/api/users",
    { query: Pagination, response: z.array(PublicUser), schema: { tags: "users" } },
    requireAdmin,
    function listAllUsers(ctx) {
      return listUsers(ctx.url.query);
    },
  )
  .get(
    "/api/users/:id",
    { response: PublicUser, schema: { tags: "users" } },
    requireAdmin,
    async function readOneUser(ctx) {
      const user = await userRecords.get(ctx.url.params.id);
      if (!user) return 404;
      return { id: ctx.url.params.id, ...user };
    },
  )
  .put(
    "/api/users/:id",
    { body: UserPatch, response: PublicUser, schema: { tags: "users" } },
    requireUser,
    async function updateOneUser(ctx) {
      const { id } = ctx.url.params;
      // Admins edit anyone and roles; a member only their own name
      const admin = ctx.user.role === "admin";
      if (!admin && ctx.session.user !== id) return 403;
      if (!admin && ctx.body.role) return 403;

      const stored = await userRecords.get(id);
      if (!stored) return 404;
      const updated = { ...stored, ...ctx.body };
      await userRecords.set(id, updated);
      return { id, ...updated };
    },
  )
  .delete(
    "/api/users/:id",
    { schema: { tags: "users" } },
    requireAdmin,
    async function deleteOneUser(ctx) {
      await userRecords.del(ctx.url.params.id);
      return 204;
    },
  )

  // ============ API docs (Scalar over /openapi.json) ============
  .get("/docs", () => (
    <html lang="en">
      <head>
        <title>User management API</title>
        <meta charset="utf-8" />
      </head>
      <body>
        <script id="api-reference" data-url="/openapi.json"></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  ));
