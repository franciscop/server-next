# Server @ Next

> **⚠️ WIP** This is an **experimental library** right now!

A fully-fledged web server for Bun and Node.js, with all the basics covered for you:

```js
import server from "@server/next";

// Create a running instance of the server
export default server(options)
  .get("/books", () => Book.list())
  .post("/books", { body: BookSchema }, (ctx) => {
    return Book.create(ctx.body).save();
  });
```

It includes all the things you would expect from a modern Server framework, like routing, static file serving, body+file parsing, gzip+brotli, streaming, testing, error handling, websockets, etc. We also have integrations with these:

- KV Stores: in-memory, Redis, Consul, DynamoDB.
- Buckets: AWS S3, Cloudflare R2, Backblaze B2.
- Validation libraries: Zod, Joi, Yup.

```js
// Easy testing as well - index.test.js
import app from "./";
const api = app.test();  // Very convenient helper, AXIOS-like interface

it("can retrieve the homepage", async () => {
  const { data: books } = await api.get("/books/");
  expect(books[0]).toEqual({ id: 0, name: ... });
});
```

## Upgrading server

Why? We live in the era of multi-cloud (Heroku, Workers, Lambda, etc) and multi-runtimes (Node.js, Bun, WinterGC, etc). Desired improvements (WIP!):

- Tiny footprint with few dependencies. Installing and using the full library takes under 10kb (target limit).
- Faster! Reimplemented from scratch for speed. With raw ES6+ and a tiny code footprint, your server will fly.
- Modern ES6+ESM syntax for both the library and examples.
- Not using express underneath anymore. Considering keeping the compatibility layer anyway (since Express itself is a thin layer).
- Changed the reply logic greatly, including the removal of `render()`. This is the main reason express was removed. Many servers don't need render() at all.
- **[security]** Removed mandatory CSRF token, since this is only useful for server-rendered pages and not for SPA. Now we provide an `auth` module instead.

## Progress

- Router has all verbs, as well as URL pattern matches
- Full URL parsing, including `query` and `params` in `ctx.url`.
- Body and Files parsing is working (need testing)
- The middleware can return:
  - A number and it'll be set as the status code
  - A string and it'll be sent as plain text or html (if it starts with "<")
  - A readStream and it'll be piped to the response
  - An object with `status`, `body` and `headers` and it'll be set raw.
- Response compression works
- Zod light integration
- Auth work

## Examples

### Streams

Creating a 100x100px thumbnail on the fly with Sharp:

```js
// createThumbnail.js
import sharp from "sharp";

export default function createThumbnail(ctx) {
  // Return a pipe, which will be streamed to the output
  return sharp(ctx.url.params.name).resize(100, 100, { fit: "cover" }).png();
}
```

### Breaking Changes

`import`, `export` and routing are the main changes from your point of view:

```js
import server, { status, type, ...reply } from 'server';

export default server({ ...options })
  .use(mid1)
  .get('/', cb1)
  .get('/b', mid2, cb2)
  .routes({ get: [['/c', mid3, cb3]] });
```

`status()` now it's always partial:

```js
// OLD
return 404;
return status(404).send("Not here..."); // treated as partial
return status(404); // treated as final

// NEW
return 404;
return status(404).send("Not here..."); // GOOD
return status(404).send(); // GOOD

// DON'T DO:
return status(404); // INVALID
```

```js
import server from "server";

export default server()
  .get("/", () => "Hello world")
  .post("/", (ctx) => {
    console.log(ctx.body);
    return 201;
  });
```
