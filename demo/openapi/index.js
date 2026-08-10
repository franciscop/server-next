import { type } from "arktype";
import * as v from "valibot";
import z from "zod";
import server from "../..";

// The generated OpenAPI spec, built from the routes and their schemas. Any
// Standard Schema library drives it, mixed freely:
//   curl localhost:3000/openapi.json
// See ../openapi-scalar and ../openapi-swagger for adding a docs UI.

const User = z.object({ name: z.string(), email: z.string() });
const Pagination = v.object({
  page: v.optional(v.number()),
  search: v.optional(v.string()),
});
const Tag = type({ label: "string", "color?": "string" });

export default server({ openapi: true })
  // valibot: query parameters; zod: the response
  .get(
    "/users",
    {
      query: Pagination,
      response: z.array(User),
      schema: { tags: "users", title: "List the users" },
    },
    () => [],
  )
  // zod: body + response; `schema` carries the spec metadata
  .post(
    "/users",
    {
      body: User,
      response: User,
      schema: { tags: "users", title: "Create a user" },
    },
    () => 201,
  )
  .put(
    "/users/:id(number)",
    {
      body: User,
      response: User,
      schema: { tags: "users", title: "Replace a user" },
    },
    (ctx) => {
      console.log(ctx.url.params.id, ctx.body);
      return 200;
    },
  )
  // arktype
  .post(
    "/tags",
    { body: Tag, response: Tag, schema: { tags: "tags", title: "Create a tag" } },
    (ctx) => ctx.body,
  )
  .delete("/users/:id(number)", { schema: { tags: "users" } }, (ctx) => {
    console.log(ctx.url.params.id);
    return 200;
  });
