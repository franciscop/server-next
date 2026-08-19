// Compile-time only: the `ContextTypes` generic types ctx app-wide at
// `server()`, per sub-router at `router()`, and for detached functions at
// `Context`/`Middleware`. Its keys mirror ctx (`user`, `params`, `query`,
// `body`), each taking a plain type or a Standard Schema. Checked by
// `tsc --noEmit` like the other .test-d files.
import { z } from "zod";
import server, { router, type Context, type Middleware } from ".";

type User = { id: string; email: string; role: "admin" | "user" };

// The server generic types ctx.user in every inline handler
server<{ user: User }>()
  .get("/me", (ctx) => {
    const role: "admin" | "user" | undefined = ctx.user?.role;
    // @ts-expect-error `plan` is not a field of User
    ctx.user?.plan;
    return { role };
  })
  // Path params and route schemas layer on top of the app-level generic
  .post("/posts/:id", { body: z.object({ title: z.string() }) }, (ctx) => {
    const id: string = ctx.url.params.id;
    const title: string = ctx.body.title;
    const email: string | undefined = ctx.user?.email;
    return { id, title, email };
  });

// @ts-expect-error a key outside ContextTypes (`usr`) is rejected
server<{ usr: User }>();

// A sub-router carries the same generic, so router-per-file keeps ctx typed
router<{ user: User }>().get("/admin", (ctx) => {
  const role: "admin" | "user" | undefined = ctx.user?.role;
  // @ts-expect-error `plan` is not a field of User
  ctx.user?.plan;
  return { role };
});

// Detached functions state just the slice they touch, schemas included
const PostSchema = z.object({ title: z.string(), draft: z.coerce.boolean() });

const updatePost = (
  ctx: Context<{ params: { id: string }; body: typeof PostSchema }>,
) => {
  const id: string = ctx.url.params.id;
  const draft: boolean = ctx.body.draft;
  // @ts-expect-error `author` is not part of the schema
  ctx.body.author;
  return { id, draft };
};

// A declared body is a required field; undeclared stays optional
const bodyRequired: {} extends Pick<
  Context<{ body: typeof PostSchema }>,
  "body"
>
  ? never
  : true = true;
const bodyOptional: {} extends Pick<Context, "body"> ? true : never = true;

const requireAdmin: Middleware<{ user: User }> = (ctx) =>
  ctx.user?.role === "admin" ? undefined : 403;

// Both mount on a route that provides those types
server<{ user: User }>().put(
  "/posts/:id",
  { body: PostSchema },
  requireAdmin,
  updatePost,
);

// Cross-tier mounting: differently-declared functions compose everywhere
const log: Middleware = (ctx) => console.log(ctx.url.pathname);

// ...a typed middleware and a bare one both register through .use()
server<{ user: User }>().use(requireAdmin).use(log);

// ...a typed router mounts on a typed server
const sub = router<{ user: User }>().get("/admin", (ctx) => ctx.user?.role);
server<{ user: User }>().use(sub);

// ...and a bare helper sits on a typed, schema'd route
server<{ user: User }>().post(
  "/posts/:id",
  { body: PostSchema },
  log,
  updatePost,
);

// A bare Context keeps open defaults
declare const plain: Context;
const _param: string = plain.url.params.anything;
const _email: string | undefined = plain.user?.email;

export type {
  _param as param,
  _email as email,
  bodyRequired,
  bodyOptional,
};
