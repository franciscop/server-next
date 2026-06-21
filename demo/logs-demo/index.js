import server, { redirect } from "../..";

// Logging demo. Run this file and watch your console:
//
//   $ node index.js        (or: bun index.js)
//   [server:uploads] ./uploads
//   [server:start] http://localhost:3000/
//
// `log: 'info'` turns it on; without it (the default) nothing is logged. You can
// also enable it from the environment with `LOG_LEVEL=info node index.js`.
//
// Then make some requests and watch the colored [server:api] lines:
//
//   curl localhost:3000/                            GET  / → 200 OK
//   curl -X POST -d 'hi there' localhost:3000/echo  POST /echo 8b → 200 OK 8b
//   curl -i localhost:3000/old                      GET  /old → 302 Found → /
//   curl localhost:3000/missing                     GET  /missing → 404 Not Found
//   curl localhost:3000/favicon.ico                 GET  /favicon.ico → 204 No Content

export default server({ log: "info", uploads: "./uploads" })
  .get("/", () => "Hello! Watch the [server:api] logs in your console.\n")
  .post("/echo", (ctx) => ctx.body)
  .get("/old", () => redirect("/"))
  .get("/slow", async () => {
    await new Promise((done) => setTimeout(done, 250));
    return "...done\n";
  });
