import server, { file } from "../..";

export default server({ uploads: "./uploads/" })
  .get("/", () => file("./index.html"))
  .post("/:id", async (ctx) => {
    const key = ctx.url.params.id;
    console.log(ctx.body);
    return key;
  })
  .put("/:id", async (ctx) => {
    const key = ctx.url.params.id;
    console.log(ctx.body);
    return key;
  });
