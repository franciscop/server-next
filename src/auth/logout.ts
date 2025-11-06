import { cookies } from "../reply.js";
import type { Context } from "../types.js";

export default async function logout(ctx: Context): Promise<any> {
  const { id, type } = ctx.auth;
  await ctx.options.auth.session.del(id);

  if (type === "token") {
    return { token: null };
  }
  if (type === "cookie") {
    return cookies({ authorization: null }).redirect("/");
  }
  if (type === "jwt") {
    throw new Error("JWT auth not supported yet");
  }
  if (type === "key") {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
}
