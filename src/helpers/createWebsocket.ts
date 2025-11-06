export default function createWebsocket(sockets: any[], handlers: any) {
  return {
    message: async (socket: any, body: any) => {
      handlers.socket
        ?.filter((s: any) => s[1] === "message")
        ?.map((s: any) => s[2]({ socket, sockets, body }));
    },
    open: (socket: any) => {
      sockets.push(socket);
      handlers.socket
        ?.filter((s: any) => s[1] === "open")
        ?.map((s: any) => s[2]({ socket, sockets, body: undefined }));
    },
    close: (socket: any) => {
      sockets.splice(sockets.indexOf(socket), 1);
      handlers.socket
        ?.filter((s: any) => s[1] === "close")
        ?.map((s: any) => s[2]({ socket, sockets, body: undefined }));
    },
  };
}
