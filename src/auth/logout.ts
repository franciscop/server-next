import type { Body, Context } from "..";
import { cookies } from "../reply";
import findSessionId from "./findSessionId";

export default async function logout(ctx: Context): Promise<Body> {
  const { strategy } = ctx.options.auth;

  // `jwt` is stateless: there's no server-side login to revoke, the client
  // just discards the token. The others delete the login record.
  if (!strategy.includes("jwt")) {
    const prev = findSessionId(ctx);
    if (prev) await ctx.options.auth.sessions.del(prev);
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
