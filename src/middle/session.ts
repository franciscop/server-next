import type { Context } from "..";
import findSessionId from "../auth/findSessionId";
import ServerError from "../ServerError";

// What each request's session looked like when it was loaded: the id it came
// under (none for a fresh visitor) and a snapshot of the data, so the write
// side only persists when something actually changed. Login rotates the id
// here, and logout resets the whole entry. No entry means this request has no
// session at all, and nothing is ever written for it.
export const loaded = new WeakMap<Context, { id?: string; data: string }>();

// Some requests have nowhere to keep a session: `jwt` is stateless by choice,
// and a guest on the bearer-only `token` strategy has no carrier for one. Both
// fail loudly instead of silently minting records the client can't use.
function noSession(error: (key: string) => Error): Record<string, any> {
  const target: Record<string | symbol, any> = {};
  return new Proxy(target, {
    get(target, key) {
      if (typeof key === "symbol" || key === "then") return target[key];
      throw error(String(key));
    },
    set(target, key, value) {
      if (typeof key === "symbol") {
        target[key] = value;
        return true;
      }
      throw error(String(key));
    },
  });
}

export default async function session(ctx: Context): Promise<void> {
  const strategy = ctx.options.auth?.strategy;

  if (strategy?.includes("jwt")) {
    ctx.session = noSession((key) => ServerError.SESSION_JWT({ key }));
    return;
  }

  const id = findSessionId(ctx);
  // Bearer-only: a `token` request with no credential is a guest with no
  // session, rather than one silently kept in a cookie it never sends back
  if (!id && strategy?.includes("token")) {
    ctx.session = noSession((key) => ServerError.SESSION_GUEST({ key }));
    return;
  }

  ctx.session = (id && (await ctx.options.sessions.get(id))) || {};
  loaded.set(ctx, { id, data: JSON.stringify(ctx.session) });
}
