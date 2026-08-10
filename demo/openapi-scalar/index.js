import server, { status } from "../..";
import z from "zod";

// A note-taking API with its docs UI: any viewer is a static shell pointing
// at /openapi.json, so it's a plain route. This one uses Scalar.
//   open http://localhost:3000/docs

const User = z.object({ name: z.string(), email: z.string() });
const Note = z.object({ title: z.string(), body: z.string() });
const Pagination = z.object({
  page: z.number().optional(),
  search: z.string().optional(),
});
const withId = (schema) => schema.extend({ id: z.string() });

const users = new Map();
const notes = new Map();
const list = (map) => [...map.entries()].map(([id, data]) => ({ id, ...data }));

export default server({
  openapi: { title: "Notes API", description: "A note-taking example" },
})
  // Users
  .get(
    "/users",
    { query: Pagination, response: z.array(withId(User)), schema: { tags: "users" } },
    () => list(users),
  )
  .post(
    "/users",
    { body: User, response: withId(User), schema: { tags: "users" } },
    (ctx) => {
      const id = crypto.randomUUID();
      users.set(id, ctx.body);
      return status(201).json({ id, ...ctx.body });
    },
  )
  .get("/users/:id", { schema: { tags: "users" } }, (ctx) => {
    return users.get(ctx.url.params.id) ?? 404;
  })
  .put(
    "/users/:id",
    { body: User, response: withId(User), schema: { tags: "users" } },
    (ctx) => {
      if (!users.has(ctx.url.params.id)) return 404;
      users.set(ctx.url.params.id, ctx.body);
      return { id: ctx.url.params.id, ...ctx.body };
    },
  )
  .delete("/users/:id", { schema: { tags: "users" } }, (ctx) => {
    users.delete(ctx.url.params.id);
    return 204;
  })

  // Notes
  .get(
    "/notes",
    { query: Pagination, response: z.array(withId(Note)), schema: { tags: "notes" } },
    () => list(notes),
  )
  .post(
    "/notes",
    { body: Note, response: withId(Note), schema: { tags: "notes" } },
    (ctx) => {
      const id = crypto.randomUUID();
      notes.set(id, ctx.body);
      return status(201).json({ id, ...ctx.body });
    },
  )
  .get("/notes/:id", { schema: { tags: "notes" } }, (ctx) => {
    return notes.get(ctx.url.params.id) ?? 404;
  })
  .put(
    "/notes/:id",
    { body: Note, response: withId(Note), schema: { tags: "notes" } },
    (ctx) => {
      if (!notes.has(ctx.url.params.id)) return 404;
      notes.set(ctx.url.params.id, ctx.body);
      return { id: ctx.url.params.id, ...ctx.body };
    },
  )
  .delete("/notes/:id", { schema: { tags: "notes" } }, (ctx) => {
    notes.delete(ctx.url.params.id);
    return 204;
  })

  // The docs UI: Scalar's shell over /openapi.json
  .get("/docs", () => `<!doctype html>
<html>
  <head>
    <title>Notes API Docs</title>
    <meta charset="utf-8" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
