import server from "../../";

export default server()
  .get("/users/:id", (ctx) => {
    console.log(ctx.url.params.id);
    return "nero";
  })
  .get("/users/:id/posts/:postId?", (ctx) => {
    console.log(ctx.url.params);
    return "nerin";
  });
