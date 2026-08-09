import server, { ValidationError } from "../..";
import { z } from "zod";

// Route validation with zod (any Standard Schema library works the same).
// Run it with `node index.js` (or `bun index.js`) and try the curls below.

const User = z.object({
  name: z.string().min(1),
  // Coercion applies: the validated value replaces ctx.body, so age is a number
  age: z.coerce.number().int().min(0),
});

const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export default server({
  // By default a failing schema responds 422 with a generic message. To shape
  // the response yourself (say, an API returning the issues as JSON), catch the
  // ValidationError in onError; `issues` has each failure's message and path.
  onError: (error) => {
    if (error instanceof ValidationError && error.source !== "response") {
      const body = { error: `Invalid ${error.source}`, issues: error.issues };
      return Response.json(body, { status: 422 });
    }
    return new Response(error.message || "Server Error", {
      status: error.status || 500,
    });
  },
})
  // The body is validated (and coerced) before the handler runs
  //   curl -X POST localhost:3000/users -H content-type:application/json -d '{"name":"Ada","age":"36"}'
  //   curl -X POST localhost:3000/users -H content-type:application/json -d '{"age":-1}'
  .post("/users", { body: User }, (ctx) => ctx.body)

  // The query string too: page arrives as a string, the schema makes it a number
  //   curl "localhost:3000/users?page=2"
  //   curl "localhost:3000/users?page=zero"
  .get("/users", { query: Pagination }, (ctx) => ({
    page: ctx.url.query.page,
    users: [],
  }))

  // A `response` schema guards what you send out; a mismatch is a 500, and the
  // client only ever sees "Server Error" (the issues stay in onError)
  //   curl -i localhost:3000/leaky
  .get("/leaky", { response: User }, () => ({ password: "hunter2" }));
