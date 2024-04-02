import server from ".";

server()
  .get("/", (ctx) => {
    console.log(ctx.method);
    console.log(ctx.url);
    console.log(ctx.headers);
    console.log(ctx.cookies);
    console.log(ctx.body);
  })
  .post("/", () => {
    return 201;
  });
