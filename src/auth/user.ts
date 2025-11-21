import ServerError from "../ServerError";
import type { Context, UserRecord } from "..";

export default async function user(ctx: Context): Promise<UserRecord> {
  if (!ctx.auth) return;

  const user = await ctx.options.auth.store.get(ctx.auth.user);
  if (!user) throw ServerError.AUTH_NO_USER();
  return ctx.options.auth.cleanUser(user);
}
