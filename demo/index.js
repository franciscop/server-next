import server, { get, post } from "../src/index.js";

// Random JSON blob
import blob from "./blob.js";

const form = `
  <!DOCTYPE html>
  <html lang="en">
    <head><meta charset="UTF-8"><title>File Upload Demo</title></head>
    <body>
      <form action="/form" method="POST" enctype="multipart/form-data">
        <input type="text" name="name" required />
        <input type="file" name="profile" />
        <button>Send</button>
      </form>
    </body>
  </html>
`;

server(
  // The port will rightfully be ignored on Cloudflare
  { port: 3002 },
  get("/", (ctx) => blob),
  get("/cookies", () => () => ({ cookies: { abc: "def", ghi: "jkl" } })),
  get("/error", () => new Error("World's on fire")),
  get("/users/:id", (ctx) => {
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
  }),

  // File handling on Node.js
  get("/form", () => form),
  post("/form", (ctx) => ({ body: ctx.body, files: ctx.files }))
);
