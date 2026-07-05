import type { IncomingMessage } from "node:http";
import type { BunEnv, Server } from "..";
import socketUser from "../auth/socketUser";
import { handleRequest, iterate, parseCookies, parseHeaders } from "../helpers";
import { attachWebsocket } from "../helpers/wsNode";
import createNode from "./node";
import createWinter from "./winter";

export const Winter = async (app: Server, request: Request, env: BunEnv) => {
	// A WebSocket upgrade (Bun): resolve the auth user from the request and pass
	// it along as the socket's `data`, so handlers see it as `ctx.user`. Only
	// actual upgrade requests are handed to `env.upgrade`; everything else falls
	// through to the normal request pipeline below.
	if (env?.upgrade) {
		const wantsWs =
			String(request.headers.get("upgrade") || "").toLowerCase() ===
			"websocket";
		if (wantsWs) {
			const headers = parseHeaders(request.headers);
			const cookies = parseCookies(headers.cookie);
			// A present-but-invalid credential throws: refuse the upgrade with 401,
			// the same status an HTTP route gives (absent/expired connects anonymously).
			let user: unknown;
			try {
				user = await socketUser(app, headers, cookies);
			} catch {
				return new Response("Unauthorized", { status: 401 });
			}
			if (env.upgrade(request, { data: { user } })) return;
		}
	}
	Object.assign(globalThis.env, env); // Extend env with the passed vars

	// In Bun, the 2nd fetch arg is the server object (with .requestIP/.upgrade)
	const ctx = await createWinter(request, app, env);
	const res = await handleRequest(app, ctx);
	return res;
};

export const Node = async (app: Server) => {
	const http = await import("node:http");

	const server = http.createServer(
		async (request: IncomingMessage, response) => {
			const ctx = await createNode(request, app);
			if ("error" in ctx) throw ctx.error;

			const out = await handleRequest(app, ctx);

			response.writeHead(out.status || 200, parseHeaders(out.headers));
			try {
				if (out.body instanceof ReadableStream) {
					await iterate(out.body, (chunk) => response.write(chunk));
				} else {
					response.write(out.body || "");
				}
				response.end();
			} catch {
				// The stream errored after the headers (and maybe some body) were sent,
				// so we can't change the status. Abort the connection so the client sees
				// a truncated/failed response rather than a clean end, and we don't leak
				// an unhandled rejection out of the request callback.
				if (!response.destroyed) response.destroy();
			}
		},
	);

	// WebSockets: handle the HTTP upgrade and bridge to the `.socket()` handlers
	await attachWebsocket(server, app);

	server.listen(app.settings.port, () => {
		app.settings.log.start(`http://localhost:${app.settings.port}/`);
	});

	return server;
};

export const Netlify = async (
	app: Server,
	request: Request,
	context: unknown,
) => {
	// ?? consider simply renaming to "ctx.next()"
	// @ts-expect-error
	request.context = context;
	if (typeof Netlify === "undefined") {
		throw new Error("Netlify doesn't exist");
	}
	const ctx = await createWinter(request, app);
	const res = await handleRequest(app, ctx);
	return res;
};
