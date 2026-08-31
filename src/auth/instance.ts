import router from "../router";
import type { AuthEntry, Context } from "../types";

// A library that runs its own handshake and serves its own routes (the Better
// Auth shape): everything under its path is forwarded to it verbatim, and its
// own `user()` is what resolves ctx.user.
export default function instanceEntry(instance: any): AuthEntry {
  const path = (instance.path ?? "/api/auth").replace(/\/$/, "");
  // A true passthrough: `parser: 'stream'` leaves the body unread, so the
  // library gets the exact bytes it signs and parses itself
  const raw = { parser: "stream" as const };
  const forward = (ctx: Context) =>
    instance.handler(
      new Request(ctx.url.href, {
        method: ctx.method,
        headers: ctx.headers as Record<string, string>,
        body: ctx.body as ReadableStream | undefined,
        // Required by fetch whenever a body is a stream
        ...(ctx.body ? { duplex: "half" } : {}),
      } as RequestInit),
    );

  return {
    name: `instance:${path}`,
    user: async (ctx: Context) => instance.user?.(ctx),
    routes: () => {
      const wildcard = `${path}/*`;
      return router()
        .get(wildcard, raw, forward)
        .post(wildcard, raw, forward)
        .put(wildcard, raw, forward)
        .patch(wildcard, raw, forward)
        .delete(wildcard, raw, forward);
    },
  };
}
