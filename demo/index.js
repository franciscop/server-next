import server, { get, post } from "../src/index.js";

server(
  // The port will rightfully be ignored on Cloudflare
  { port: 3002 },
  get("/", ctx => {
    console.log(ctx);
    return "Hello world";
  }),
  get("/error", () => new Error("World's on fire")),
  get("/:id", ctx => `It works! ID: ${ctx.params.id}`),
  post(({ body, query, path, url }) => {
    console.log(body, query, path, url);
    return "OK!";
  })
).then(ctx => {
  console.log(`Running on ${ctx.runtime} ${JSON.stringify(ctx.options)}`);
});
