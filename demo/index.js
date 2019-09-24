import server, { get, post } from "../src/index.js";

server(
  // The port will rightfully be ignored on Cloudflare
  { port: 3002 },
  get("/", ctx => "Hello world"),
  get("/error", () => new Error("World's on fire")),
  get("/abc/:id", ctx => {
    // console.log("Full:", {
    //   url: ctx.url,
    //   protocol: ctx.protocol,
    //   host: ctx.host,
    //   hostname: ctx.hostname,
    //   port: ctx.port,
    //   params: ctx.params,
    //   query: ctx.query,
    //   body: ctx.body
    // });
    return `It works! ID: ${ctx.params.id}`;
  }),
  post(({ body, query, path, url }) => {
    // console.log(body, query, path, url);
    return "OK!";
  })
).then(ctx => {
  console.log(`Running on ${ctx.runtime} ${JSON.stringify(ctx.options)}`);
});
