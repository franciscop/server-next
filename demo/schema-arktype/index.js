import server from "../..";
import { type } from "arktype";

// Route validation with arktype (any Standard Schema library works the same).
// Run it with `node index.js` (or `bun index.js`) and try the curls below.

const User = type({
  name: "string > 0",
  email: "string.email",
  "age?": "number >= 0",
});

const Params = type({
  // Route params arrive as strings; this parses the id into a number
  id: "string.numeric.parse",
});

export default server()
  // The body is validated before the handler runs; a failure is a 422 with a
  // generic message, so nothing internal leaks
  //   curl -X POST localhost:3000/users -H content-type:application/json -d '{"name":"Ada","email":"ada@example.com"}'
  //   curl -X POST localhost:3000/users -H content-type:application/json -d '{"name":"Ada","email":"nope"}'
  .post("/users", { body: User }, (ctx) => ctx.body)

  // Params too: the schema rejects non-numeric ids and parses valid ones
  //   curl localhost:3000/users/42
  //   curl localhost:3000/users/ada
  .get("/users/:id", { params: Params }, (ctx) => ({
    id: ctx.url.params.id,
    name: "Ada",
  }));
