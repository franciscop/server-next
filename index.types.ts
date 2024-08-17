import server, { headers } from ".";

server()
  .get("/", (ctx) => {
    console.log(ctx.method);
    console.log(ctx.url);
    console.log(ctx.headers);
    console.log(ctx.cookies);
    console.log(ctx.body);
    return headers();
  })
  .post("/", () => {
    return 201;
  });
