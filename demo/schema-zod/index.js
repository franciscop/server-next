import server, { status, ValidationError } from "../..";
import { z } from "zod";

// A note-taking API validated with zod (any Standard Schema library works the
// same). Run `npm run dev` and try the curls below.

const Note = z.object({
  title: z.string().min(1),
  body: z.string().default(""),
  // Coercion applies: the validated value replaces ctx.body, so pins arrive
  // as booleans even from forms
  pinned: z.coerce.boolean().default(false),
});
const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
const Id = z.object({ id: z.uuid() });

const notes = new Map();
const list = (map) => [...map.entries()].map(([id, data]) => ({ id, ...data }));

export default server({
  // By default a failing schema responds 422 with a generic message. To shape
  // the response yourself (say, an API returning the issues as JSON), catch
  // the ValidationError in onError; `issues` has each failure's message/path.
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
  // The query string is validated and coerced: page arrives as a number
  //   curl "localhost:3000/notes?page=2"
  //   curl "localhost:3000/notes?page=zero"
  .get("/notes", { query: Pagination }, (ctx) => {
    const { page, search } = ctx.url.query;
    const all = list(notes).filter((n) => !search || n.title.includes(search));
    return all.slice((page - 1) * 10, page * 10);
  })

  // The body is validated before the handler runs
  //   curl -X POST localhost:3000/notes -H content-type:application/json -d '{"title":"Groceries","pinned":"true"}'
  //   curl -X POST localhost:3000/notes -H content-type:application/json -d '{"body":"no title"}'
  .post("/notes", { body: Note }, (ctx) => {
    const id = crypto.randomUUID();
    notes.set(id, ctx.body);
    return status(201).json({ id, ...ctx.body });
  })

  // Params too: a malformed id is a 422 before the handler ever runs
  //   curl localhost:3000/notes/not-a-uuid
  .get("/notes/:id", { params: Id }, (ctx) => {
    return notes.get(ctx.url.params.id) ?? 404;
  })
  .put("/notes/:id", { params: Id, body: Note }, (ctx) => {
    if (!notes.has(ctx.url.params.id)) return 404;
    notes.set(ctx.url.params.id, ctx.body);
    return { id: ctx.url.params.id, ...ctx.body };
  })
  .delete("/notes/:id", { params: Id }, (ctx) => {
    notes.delete(ctx.url.params.id);
    return 204;
  });
