import server from "../../";

export default server()
  .get("/pages/:id", (ctx) => {
    ctx.url.params.id; // string
  })
  .get("/users/:id(number)", (ctx) => {
    ctx.url.params.id; // number
  })
  .get("/reports/:date(date)", (ctx) => {
    ctx.url.params.date; // Date
  });
