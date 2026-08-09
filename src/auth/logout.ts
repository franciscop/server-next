import type { Body, Context } from "..";
import { loaded } from "../middle/session";
import { cookies } from "../reply";

export default async function logout(ctx: Context): Promise<Body> {
  const { strategy } = ctx.options.auth;

  // `jwt` is stateless: there's no server-side session to revoke, the client
  // just discards the token. The others delete the whole session record, so
  // app data doesn't survive a sign-out either.
  if (!strategy.includes("jwt")) {
    const prev = loaded.get(ctx);
    if (prev?.id) await ctx.options.sessions.del(prev.id);
    ctx.session = {};
    loaded.set(ctx, { id: undefined, data: "{}" });
  }

  // Event only; `ctx.user` is still set for this last request
  if (ctx.options.auth.onLogout) await ctx.options.auth.onLogout(ctx);

  if (strategy.includes("token") || strategy.includes("jwt")) {
    return { token: null };
  }
  if (strategy.includes("cookie")) {
    return cookies({ session: null }).redirect("/");
  }
  throw new Error("Unknown auth type");
}
