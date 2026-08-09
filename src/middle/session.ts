import type { Context } from "..";
import findSessionId from "../auth/findSessionId";
import ServerError from "../ServerError";

// What each request's session looked like when it was loaded: the id it came
// under (none for a fresh visitor) and a snapshot of the data, so the write
// side only persists when something actually changed. Login rotates the id
// here, and logout resets the whole entry.
export const loaded = new WeakMap<Context, { id?: string; data: string }>();

// Under `jwt` there is no ctx.session at all (the strategy is stateless by
// choice), so any access fails loudly instead of silently minting records
function jwtSession(): Record<string, any> {
  const target: Record<string | symbol, any> = {};
  return new Proxy(target, {
    get(target, key) {
      if (typeof key === "symbol" || key === "then") return target[key];
      throw ServerError.SESSION_JWT({ key: String(key) });
    },
    set(target, key, value) {
      if (typeof key === "symbol") {
        target[key] = value;
        return true;
      }
      throw ServerError.SESSION_JWT({ key: String(key) });
    },
  });
}

export default async function session(ctx: Context): Promise<void> {
  if (ctx.options.auth?.strategy.includes("jwt")) {
    ctx.session = jwtSession();
    return; // no `loaded` entry: parseResponse skips persistence too
  }
  const id = findSessionId(ctx);
  ctx.session = (id && (await ctx.options.sessions.get(id))) || {};
  loaded.set(ctx, { id, data: JSON.stringify(ctx.session) });
}
