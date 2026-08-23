// Compile-time only: `ctx.user` is inferred from the `auth` option, so an app
// never declares a User type. Checked by `tsc --noEmit` like the other
// .test-d files. See docs/5. Authentication.md.
import server from ".";

type User = { id: string; email: string; role: "admin" | "user" };
type Claims = { sub: string; email: string; app_metadata?: { role?: string } };

declare const db: {
  users: {
    find(id: string): Promise<User | undefined>;
    upsert(profile: unknown): Promise<User>;
    byApiKey(key?: string): Promise<User | undefined>;
  };
};

// 1. A login flow with your database: ctx.user comes from `getUser`
server({
  auth: {
    providers: "github",
    onLogin: async (profile) => (await db.users.upsert(profile)).id,
    getUser: (id) => db.users.find(id),
  },
}).get("/me", (ctx) => {
  const role: "admin" | "user" | undefined = ctx.user?.role;
  // @ts-expect-error `plan` is not a field of User
  ctx.user?.plan;
  return { role };
});

// `onLogin` receives the normalised profile, and returning a non-id is an error
server({
  auth: {
    providers: "github",
    onLogin: (profile) => {
      const provider: string = profile.provider;
      const company: unknown = profile.raw.company;
      return `${provider}:${String(company)}`;
    },
    getUser: (id) => db.users.find(id),
  },
});

// 2. No database: no callbacks, so ctx.user is the profile itself
server({ auth: "cookie:github" }).get("/me", (ctx) => {
  const email: string | undefined = ctx.user?.email;
  // @ts-expect-error the profile has no `role`
  ctx.user?.role;
  return { email };
});

// 3. Checking a token minted elsewhere: claims by default...
server({ auth: { issuer: "https://x.supabase.co/auth/v1", audience: "authenticated" } })
  .get("/me", (ctx) => {
    const sub: string | undefined = ctx.user?.sub;
    return { sub };
  });

// ...or your own row, when `getUser` maps it
server({
  auth: {
    issuer: "https://x.supabase.co/auth/v1",
    audience: "authenticated",
    getUser: (id) => db.users.find(id),
  },
}).get("/me", (ctx) => {
  const role: "admin" | "user" | undefined = ctx.user?.role;
  return { role };
});

// 4. A function: whatever it returns
server({ auth: (ctx) => db.users.byApiKey(String(ctx.headers["x-api-key"])) }).get(
  "/me",
  (ctx) => {
    const id: string | undefined = ctx.user?.id;
    // @ts-expect-error not a field of User
    ctx.user?.nope;
    return { id };
  },
);

// 5. One method per app: an array is refused at the type level too
server({
  // @ts-expect-error several methods are not accepted; use `providers`
  auth: [(ctx: any) => ({ id: "1" })],
});

// The explicit generic still wins, for apps that declare their own
server<{ user: User }>().get("/me", (ctx) => {
  const role: "admin" | "user" | undefined = ctx.user?.role;
  return { role };
});

// Being signed out is `ctx.user` being undefined, so it is always checked
// first. This repo compiles with `strict: false`, so reading it unchecked is
// only an error in an app with strictNullChecks on, which is the normal case.
server({
  auth: {
    providers: "github",
    onLogin: async (profile) => (await db.users.upsert(profile)).id,
    getUser: (id) => db.users.find(id),
  },
}).get("/admin", (ctx) => {
  if (!ctx.user) return 401;
  const role: "admin" | "user" = ctx.user.role;
  return { role };
});
