import type { AuthUser, Context } from "..";
import ServerError from "../ServerError";

export default async function user(ctx: Context): Promise<AuthUser> {
  if (!ctx.auth) return;

  const user = await ctx.options.auth.store.get<AuthUser>(ctx.auth.user);
  if (!user) throw ServerError.AUTH_NO_USER();
  return ctx.options.auth.cleanUser(user);
}
