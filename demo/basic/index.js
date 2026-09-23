import server, { status } from "../..";

// A basic demo of the HTTP methods and the different ways to reply. Run it with
// `node index.js` (or `bun index.js`) and try the requests in the comments.

export default server()
  // A plain string → text/plain
  //   curl localhost:3000/
  .get("/", () => "Hello world")

  // An object → application/json
  //   curl localhost:3000/json
  .get("/json", () => ({ hello: "world" }))

  // A route parameter, read from ctx.url.params
  //   curl localhost:3000/hello/Francisco
  .get("/hello/:name", (ctx) => `Hello ${ctx.url.params.name}`)

  // The query string, parsed into ctx.url.query
  //   curl "localhost:3000/search?q=books&page=2"
  .get("/search", (ctx) => ctx.url.query)

  // Read a POST body from ctx.body (JSON or form fields) and echo it back
  //   curl -X POST localhost:3000/echo -H content-type:application/json -d '{"a":1}'
  .post("/echo", (ctx) => ctx.body)

  // Return a status code directly (201 Created, empty body)
  //   curl -i -X POST localhost:3000/users
  .post("/users", () => 201)

  // PUT and PATCH, using the id parameter
  //   curl -X PUT   localhost:3000/users/42
  //   curl -X PATCH localhost:3000/users/42
  .put("/users/:id", (ctx) => `Replaced user ${ctx.url.params.id}`)
  .patch("/users/:id", (ctx) => `Updated user ${ctx.url.params.id}`)

  // DELETE with an explicit 204 No Content
  //   curl -i -X DELETE localhost:3000/users/42
  .delete("/users/:id", () => status(204).send());
