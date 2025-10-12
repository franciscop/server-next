export default function createWebsocket(sockets, handlers) {
  return {
    message: async (socket, body) => {
      handlers.socket
        ?.filter((s) => s[1] === "message")
        ?.map((s) => s[2]({ socket, sockets, body }));
    },
    open: (socket) => {
      sockets.push(socket);
      handlers.socket
        ?.filter((s) => s[1] === "open")
        ?.map((s) => s[2]({ socket, sockets, body }));
    },
    close: (socket) => {
      sockets.splice(sockets.indexOf(socket), 1);
      handlers.socket
        ?.filter((s) => s[1] === "close")
        ?.map((s) => s[2]({ socket, sockets, body }));
    },
  };
}
