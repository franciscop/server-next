import NoSession from "./NoSession.js";
import type { Context } from "../types.js";

export default async function session(ctx: Context): Promise<any> {
  const store = ctx.options.session?.store;

  // If there's no store at all, we don't have session available;
  // but that's okay, since it's only a problem if you try to use it
  if (!store) return NoSession;

  // There's a session cookie; use it as the key to get the data
  // from the store
  if (ctx.cookies.session) {
    const session = await store.get(ctx.cookies.session);
    if (session) return session;
  }

  return {};
}
