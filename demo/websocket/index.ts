import server, { file } from "../..";

export default server()
  .get("/", () => file("./index.html"))
  .socket("message", (ctx) => {
    // ctx.body is what the client sent
    ctx.socket.send(`You said: ${ctx.body}`);
  });
