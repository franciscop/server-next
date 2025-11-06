import ServerError from "../ServerError.js";
import type { Context } from "../types.js";

export default async function user(ctx: Context): Promise<any> {
  if (!ctx.auth) return;

  const user = await ctx.options.auth.store.get(ctx.auth.user);
  if (!user) throw ServerError.AUTH_NO_USER();
  return ctx.options.auth.cleanUser(user);
}
