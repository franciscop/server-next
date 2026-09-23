import router from "../router";
import type { Context } from "../types";
import type { AuthContext, AuthEntry, AuthInstance } from "./types";

// Better Auth: it runs its own handshake and serves its own routes. Everything
// under its base path is forwarded to it verbatim, and its session is ctx.user.
export default function instanceEntry(instance: AuthInstance): AuthEntry {
  const path = (instance.options?.basePath ?? "/api/auth").replace(/\/$/, "");
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
    user: async (ctx: AuthContext) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(ctx.headers)) {
        headers.set(
          key,
          Array.isArray(value) ? value.join(", ") : String(value),
        );
      }
      const session = await instance.api.getSession({ headers });
      return session?.user ?? undefined;
    },
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
