// Compile-time only: a route's `body` and `query` schemas type `ctx.body` and
// `ctx.url.query` through Standard Schema's inferred output, with no generic
// to write. Checked by `tsc --noEmit` like the other .test-d files.
import { z } from "zod";
import server from ".";

server()
  .post(
    "/users",
    { body: z.object({ name: z.string(), age: z.coerce.number() }) },
    (ctx) => {
      const name: string = ctx.body.name;
      const age: number = ctx.body.age;
      // @ts-expect-error `nope` is not part of the schema
      ctx.body.nope;
      return { name, age };
    },
  )
  .get(
    "/list",
    { query: z.object({ page: z.coerce.number() }) },
    (ctx) => {
      const page: number = ctx.url.query.page;
      // @ts-expect-error `missing` is not part of the schema
      ctx.url.query.missing;
      return { page };
    },
  )
  .get("/plain/:id", (ctx) => {
    // Without schemas nothing changes: params from the path, query free-form
    const id: string = ctx.url.params.id;
    const q: string = ctx.url.query.anything;
    return { id, q };
  });

// Unknown route-option keys are flagged at the key, even next to valid ones
server().post(
  "/typo",
  // @ts-expect-error `cachee` is not a route option
  { body: z.object({ ok: z.string() }), cachee: "1h" },
  () => 200,
);
