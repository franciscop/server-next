import type { Body, Context } from "..";
import { cookies } from "../reply";
import findSessionId from "./findSessionId";

export default async function logout(ctx: Context): Promise<Body> {
  const session = findSessionId(ctx);
  const { strategy } = ctx.user;
  await ctx.options.auth.session.del(session);

  if (!strategy) throw new Error(`Invalid strategy "${strategy}"`);
  if (strategy.includes("token")) {
    return { token: null };
  }
  if (strategy.includes("cookie")) {
    return cookies({ authorization: null }).redirect("/");
  }
  if (strategy.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (strategy.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
}
