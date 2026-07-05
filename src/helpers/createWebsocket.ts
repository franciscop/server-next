import type { Route } from "../types";

type WebSocketHandlers = {
	socket?: Route[];
};

export default function createWebsocket(
	sockets: WebSocket[],
	handlers: WebSocketHandlers,
) {
	const run = (event: string, socket: WebSocket, body?: string | Buffer) => {
		const routes = handlers.socket?.filter((r) => r.path === event) ?? [];
		// The auth user resolved at upgrade time: on Node it's set on the socket
		// (`ws.user`), on Bun it rides along in the upgrade `data` (`ws.data.user`).
		const user = (socket as any).user ?? (socket as any).data?.user;
		for (const route of routes) {
			for (const fn of route.fns) {
				// @ts-expect-error socket callbacks receive a socket context, not a Context
				fn({ socket, sockets, body, user });
			}
		}
	};

	return {
		message: (socket: WebSocket, body: string | Buffer) =>
			run("message", socket, body),
		open: (socket: WebSocket) => {
			sockets.push(socket);
			run("open", socket);
		},
		close: (socket: WebSocket) => {
			sockets.splice(sockets.indexOf(socket), 1);
			run("close", socket);
		},
	};
}
