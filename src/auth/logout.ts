import { cookies } from "../reply";
import type { Context } from "..";

export default async function logout(ctx: Context): Promise<any> {
  const { id, type } = ctx.auth;
  await ctx.options.auth.session.del(id);

  if (type.includes("token")) {
    return { token: null };
  }
  if (type.includes("cookie")) {
    return cookies({ authorization: null }).redirect("/");
  }
  if (type.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (type.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
}
