import server, { status } from "../..";
import { type } from "arktype";

// A note-taking API validated with arktype (any Standard Schema library works
// the same). Run `npm run dev` and try the curls below.

const Note = type({
  title: "string > 0",
  "body?": "string",
});
const Pagination = type({
  // Route params and query values arrive as strings; this parses the number
  "page?": "string.numeric.parse",
  "search?": "string",
});
// Numeric ids, parsed from the path param
const Id = type({ id: "string.numeric.parse" });

let nextId = 1;
const notes = new Map();
const list = (map) => [...map.entries()].map(([id, data]) => ({ id, ...data }));

export default server()
  // The query string is validated and parsed: page becomes a number
  //   curl "localhost:3000/notes?page=2"
  //   curl "localhost:3000/notes?page=zero"
  .get("/notes", { query: Pagination }, (ctx) => {
    const { page = 1, search } = ctx.url.query;
    const all = list(notes).filter((n) => !search || n.title.includes(search));
    return all.slice((page - 1) * 10, page * 10);
  })

  // The body is validated before the handler runs; a failure is a 422 with a
  // generic message, so nothing internal leaks
  //   curl -X POST localhost:3000/notes -H content-type:application/json -d '{"title":"Groceries"}'
  //   curl -X POST localhost:3000/notes -H content-type:application/json -d '{"title":""}'
  .post("/notes", { body: Note }, (ctx) => {
    const id = nextId++;
    notes.set(id, ctx.body);
    return status(201).json({ id, ...ctx.body });
  })

  // Params too: the schema rejects non-numeric ids and parses valid ones
  //   curl localhost:3000/notes/1
  //   curl localhost:3000/notes/abc
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
