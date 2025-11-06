import server, { file } from "../../jssrc/index.js";

export default server()
  .get("/", () => file("./index.html"))
  .socket("message", (ctx) => {
    // console.log("Server. FE says:", ctx, ctx.data, ctx.body);
    console.log(ctx);
    ctx.socket.send("hello world");
  });
