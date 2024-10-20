import { cookies } from "../reply.js";

export default async function logout(ctx) {
  const { id, type } = ctx.auth;
  await ctx.options.auth.session.del(id);

  if (type === "token") {
    return { token: null };
  } else if (type === "cookie") {
    return cookies({ authorization: null }).redirect("/");
  } else if (type === "jwt") {
    throw new Error("JWT auth not supported yet");
  } else if (type === "key") {
    throw new Error("Key auth not supported yet");
  } else {
    throw new Error("Unknown auth type");
  }
}
