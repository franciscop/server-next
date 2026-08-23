import type { Server } from "..";

// The user for a WebSocket connection, from the upgrade request's headers and
// cookies, through the same entry as HTTP. A browser sends the session cookie
// automatically on a same-origin upgrade; a non-browser client can still send
// an `Authorization` header (though a browser WebSocket cannot).
//
// Behaves exactly like an HTTP request: no credential resolves to `undefined`
// for an anonymous connection, while a present-but-invalid bearer token
// throws, which the upgrade handlers catch to refuse the handshake.
export default async function socketUser(
  app: Server,
  headers: Record<string, string | string[]>,
  cookies: Record<string, string>,
): Promise<any> {
  if (!app.settings.auth) return undefined;
  // The entry only reads `options`, `headers` and `cookies`, so a partial
  // context is enough to reuse the full HTTP resolution.
  const ctx = { options: app.settings, headers, cookies } as any;
  return app.settings.auth.user(ctx);
}
