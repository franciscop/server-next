import server, { file } from "../../src/index.js";

export default server({
  bucket: "./uploads/",
  uploads: "./uploads/",
})
  .get("/", () => file("./index.html"))
  .post("/:id", async (ctx) => {
    const key = ctx.url.params.id;
    console.log(ctx.body, ctx.file, ctx.files);
    // await store.set(key, ctx.body);
    return key;
  })
  .put("/:id", async (ctx) => {
    const key = ctx.url.params.id;
    console.log(ctx.body, ctx.file, ctx.files);
    // await store.set(key, ctx.body);
    return key;
  });
