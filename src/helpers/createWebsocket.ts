import type { Middleware, RouterMethod } from "../types";

type FullRoute = [RouterMethod, string, ...Middleware[]][];

type WebSocketHandlers = {
  socket?: FullRoute;
};

export default function createWebsocket(
  sockets: WebSocket[],
  handlers: WebSocketHandlers,
) {
  return {
    message: async (socket: WebSocket, body: string | Buffer) => {
      handlers.socket
        ?.filter((s) => s[1] === "message")
        // @ts-expect-error
        ?.map((s) => s[2]({ socket, sockets, body }));
    },
    open: (socket: WebSocket) => {
      sockets.push(socket);
      handlers.socket
        ?.filter((s) => s[1] === "open")
        // @ts-expect-error
        ?.map((s) => s[2]({ socket, sockets, body: undefined }));
    },
    close: (socket: WebSocket) => {
      sockets.splice(sockets.indexOf(socket), 1);
      handlers.socket
        ?.filter((s) => s[1] === "close")
        // @ts-expect-error
        ?.map((s) => s[2]({ socket, sockets, body: undefined }));
    },
  };
}
