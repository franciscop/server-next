import type { Context, Server } from "..";

// Resolve the user before the handler runs, since resolution is async and
// `ctx.user` is a plain field.
export default function auth(app: Server) {
  const entry = app.settings.auth!;
  app.use(async function middle(ctx: Context) {
    ctx.user = await entry.user(ctx);
  });
  entry.routes?.(app);
}
