import type { Context } from "..";
import findSessionId from "../auth/findSessionId";

// What each request's session looked like when it was loaded: the id it came
// under (none for a fresh visitor) and a snapshot of the data, so the write
// side only persists when something actually changed. Login rotates the id
// here, and logout resets the whole entry.
export const loaded = new WeakMap<Context, { id?: string; data: string }>();

export default async function session(ctx: Context): Promise<void> {
  const id = findSessionId(ctx);
  ctx.session = (id && (await ctx.options.sessions.get(id))) || {};
  loaded.set(ctx, { id, data: JSON.stringify(ctx.session) });
}
