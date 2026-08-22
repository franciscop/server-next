import type { Server } from "..";

// The user for a WebSocket connection, from the upgrade request's headers and
// cookies. It reuses the exact same entries as HTTP, so every shape works: a
// browser sends the session cookie automatically on a same-origin upgrade,
// and a non-browser client can still send an `Authorization` header.
//
// A browser `WebSocket` cannot set request headers, so a cookie is the only
// carrier that authenticates browser sockets.
//
// Behaves exactly like an HTTP request: no credential resolves to `undefined`
// for an anonymous connection, while a present-but-invalid one throws, which
// the upgrade handlers catch to refuse the handshake.
export default async function socketUser(
  app: Server,
  headers: Record<string, string | string[]>,
  cookies: Record<string, string>,
): Promise<any> {
  if (!app.settings.auth) return undefined;
  // The entries only read `options`, `headers` and `cookies`, so a partial
  // context is enough to reuse the full HTTP resolution.
  const ctx = { options: app.settings, headers, cookies } as any;
  for (const entry of app.settings.auth) {
    const user = await entry.user(ctx);
    if (user) return user;
  }
}
