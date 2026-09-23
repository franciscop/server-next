import server, { status } from "../..";
import * as v from "valibot";

// A note-taking API validated with valibot (any Standard Schema library works
// the same). Run `npm run dev` and try the curls below.

const Note = v.object({
  // Transforms apply: the validated value replaces ctx.body, so titles are
  // already trimmed by the time the handler sees them
  title: v.pipe(v.string(), v.trim(), v.minLength(1)),
  body: v.optional(v.string(), ""),
});
const Pagination = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.minValue(1)), "1"),
  search: v.optional(v.string()),
});

const notes = new Map();
const list = (map) => [...map.entries()].map(([id, data]) => ({ id, ...data }));

export default server()
  // The query string is validated and transformed: page becomes a number
  //   curl "localhost:3000/notes?page=2"
  //   curl "localhost:3000/notes?page=zero"
  .get("/notes", { query: Pagination }, (ctx) => {
    const { page, search } = ctx.url.query;
    const all = list(notes).filter((n) => !search || n.title.includes(search));
    return all.slice((page - 1) * 10, page * 10);
  })

  // The body is validated before the handler runs; a failure is a 422 with a
  // generic message, so nothing internal leaks
  //   curl -X POST localhost:3000/notes -H content-type:application/json -d '{"title":"  Groceries  "}'
  //   curl -X POST localhost:3000/notes -H content-type:application/json -d '{"title":""}'
  .post("/notes", { body: Note }, (ctx) => {
    const id = crypto.randomUUID();
    notes.set(id, ctx.body);
    return status(201).json({ id, ...ctx.body });
  })
  .get("/notes/:id", (ctx) => {
    return notes.get(ctx.url.params.id) ?? 404;
  })
  .put("/notes/:id", { body: Note }, (ctx) => {
    if (!notes.has(ctx.url.params.id)) return 404;
    notes.set(ctx.url.params.id, ctx.body);
    return { id: ctx.url.params.id, ...ctx.body };
  })
  .delete("/notes/:id", (ctx) => {
    notes.delete(ctx.url.params.id);
    return 204;
  });
