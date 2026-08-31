import type { Route } from "../types";

type WebSocketHandlers = {
  socket?: Route[];
};

// What a `.socket()` handler receives: not an HTTP Context, since there is no
// request/response cycle behind a socket event.
export type SocketContext = {
  socket: WebSocket;
  sockets: WebSocket[];
  body?: string | Buffer;
  user?: unknown;
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
    const ctx: SocketContext = { socket, sockets, body, user };
    for (const route of routes) {
      for (const fn of route.fns) {
        // Fire-and-forget by design, so a throwing handler must be caught here
        // or it becomes an unhandled rejection that can crash the process.
        Promise.resolve(fn(ctx as any)).catch((error) => {
          console.error(`[server:socket] ${event} handler failed:`, error);
        });
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
