import type { Context, Server } from "..";

// Resolve the user before the handler runs, since resolution is async and
// `ctx.user` is a plain field. Entries are tried in order: the first one to
// answer wins, so a browser session and an API token can share an app.
export default function auth(app: Server) {
  const entries = app.settings.auth!;

  app.use(async function middle(ctx: Context) {
    for (const entry of entries) {
      const user = await entry.user(ctx);
      if (user) {
        ctx.user = user;
        return;
      }
    }
  });

  for (const entry of entries) entry.routes?.(app);
}
