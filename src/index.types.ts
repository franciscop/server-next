import server, { headers, router } from ".";

const users = router
  .post("/users", (ctx) => {
    console.log(ctx.url.pathname);
    console.log(ctx.url.query);
    console.log(ctx.url.params); // No .id
  })
  .get("/users/:id?", (ctx) => {
    console.log(ctx.url.params.id);
  })
  .del("/users/:id", (ctx) => {
    console.log(ctx.url.params.id);
  });

server()
  .get("/", (ctx) => {
    console.log(ctx.method);
    console.log(ctx.url);
    console.log(ctx.headers);
    console.log(ctx.cookies);
    console.log(ctx.body);
    return headers();
  })
  .router(users)
  .post("/", () => {
    return 201;
  });
