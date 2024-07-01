import ServerError from "../ServerError.js";
import findUser from "./findUser.js";

export default async function user(ctx) {
  if (!ctx.auth) return;

  const user = await findUser(ctx.auth, ctx.options.auth.store);
  if (!user) throw ServerError.AUTH_NO_USER();
  return ctx.options.auth.cleanUser(user);
}
