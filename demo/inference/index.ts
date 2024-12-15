import server from "../../";
import kv from "polystore";

export default server({
  port: 3000,
  auth: "cookie:github",
  store: kv(new Map()),
})
  .get("/users/:id", (ctx) => {
    console.log(ctx.url.params.id);
    return "nero";
  })
  .get("/users/:id(number)/posts/:postId?", (ctx) => {
    console.log(ctx.url.params);
    return "nerin";
  });
