import type { AuthUser, Server } from "..";
import getUser from "./getUser";

// Resolve the authenticated user for a WebSocket connection from the upgrade
// request's headers and cookies. It reuses the exact same `getUser` logic as
// HTTP, so every strategy works: a browser sends the `authentication` cookie
// automatically on a same-origin upgrade (the `cookie` strategy), and a
// non-browser client can still send an `Authorization: Bearer` header
// (`token` / `jwt` / `key`).
//
// A browser `WebSocket` can't set request headers, so `cookie` is the only
// strategy that authenticates browser sockets.
//
// Behaves exactly like an HTTP request: no credential (or an expired/unknown
// session) resolves to `undefined` for an anonymous connection, while a
// present-but-malformed credential throws (the same errors an HTTP route would
// turn into a 401). The upgrade handlers catch that and refuse the handshake.
export default async function socketUser(
	app: Server,
	headers: Record<string, string | string[]>,
	cookies: Record<string, string>,
): Promise<AuthUser | undefined> {
	if (!app.settings.auth) return undefined;
	// getUser only reads `options`, `headers` and `cookies`, so a partial
	// context is enough to reuse the full HTTP resolution for every strategy.
	const ctx = { options: app.settings, headers, cookies } as any;
	return getUser(ctx);
}
