import type { Body, Context } from "..";
import { cookies } from "../reply";
import findSessionId from "./findSessionId";

export default async function logout(ctx: Context): Promise<Body> {
  const { strategy } = ctx.user;
  if (!strategy) throw new Error(`Invalid strategy "${strategy}"`);

  // `jwt` is stateless: there's no server-side session to revoke, the client
  // just discards the token. The others delete their stored session record.
  if (!strategy.includes("jwt")) {
    await ctx.options.auth.session.del(findSessionId(ctx));
  }

  if (strategy.includes("token") || strategy.includes("jwt")) {
    return { token: null };
  }
  if (strategy.includes("cookie")) {
    return cookies({ authentication: null }).redirect("/");
  }
  if (strategy.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
}
