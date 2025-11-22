import type { BasicValue, Context } from "..";
import createNoSession from "./NoSession";

type StoreReturn = Record<string, BasicValue>;

export default async function session(ctx: Context): Promise<void> {
  const store = ctx.options.session?.store;

  // If there's no store at all, we don't have session available;
  // but that's okay, since it's only a problem if you try to use it
  if (!store) {
    ctx.session = createNoSession();
    return;
  }

  // There's a session cookie; use it as the key to get the data
  // from the store
  if (ctx.cookies.session) {
    const session = await store.get<StoreReturn>(ctx.cookies.session);
    ctx.session = session;
    return;
  }
}
