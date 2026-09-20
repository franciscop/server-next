import type { Context, Server } from "..";

// Requests whose user has already been resolved, so the two entry points below
// cannot do the work (a store lookup, a JWT verification) twice.
const done = new WeakSet<Context>();

// Resolve `ctx.user` from the request's credential. Called before the body is
// read, so a route that stores uploads can be refused before a byte is written.
export async function resolveUser(app: Server, ctx: Context): Promise<void> {
  if (!app.settings.auth || done.has(ctx)) return;
  done.add(ctx);
  ctx.user = await app.settings.auth.user(ctx);
}

export default function auth(app: Server) {
  const entry = app.settings.auth!;
  // Covers requests that match no route, where `assets` and the rest of the
  // global middleware answer; a matched route resolves it earlier than this.
  app.use(async function middle(ctx: Context) {
    await resolveUser(app, ctx);
  });
  if (entry.routes) app.use(entry.routes());
}
