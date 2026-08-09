import server from "../..";
import * as v from "valibot";

// Route validation with valibot (any Standard Schema library works the same).
// Run it with `node index.js` (or `bun index.js`) and try the curls below.

const User = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  // Transforms apply: the validated value replaces ctx.body, so age is a number
  age: v.pipe(v.string(), v.transform(Number), v.minValue(0)),
});

const Search = v.object({
  q: v.pipe(v.string(), v.minLength(2)),
});

export default server()
  // The body is validated (and transformed) before the handler runs; a failure
  // is a 422 with a generic message, so nothing internal leaks
  //   curl -X POST localhost:3000/users -H content-type:application/json -d '{"name":"Ada","age":"36"}'
  //   curl -X POST localhost:3000/users -H content-type:application/json -d '{"name":""}'
  .post("/users", { body: User }, (ctx) => ctx.body)

  // The query string is validated the same way
  //   curl "localhost:3000/search?q=books"
  //   curl "localhost:3000/search?q=x"
  .get("/search", { query: Search }, (ctx) => ({
    q: ctx.url.query.q,
    results: [],
  }));
