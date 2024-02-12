# Server @ Next

> **EXPERIMENTAL LIBRARY**

A fully-fledged web server for Bun and Node.js, with all the basics covered for you:

```js
import server from "@server/next";

// Create a running instance of the server
export default server(options)
  .router("/admin/", dashboard)
  .get("/users", getUsers)
  .post("/users", createUser)
  .put("/users/:id", editUser);
```

It includes all the things you would expect from a modern Server framework, like routing, static file serving, options\*, body+file parsing, gzip+brotli, streaming, server-timing, plugins\*, etc.

> \* not yet available

For testing it's also easy, since we are exporting our server throught the WinterCG API we can do:

```js
// index.test.js
import app from "./";

it("can retrieve the homepage", async () => {
  const res = await app.fetch(new Request("http://localhost:3000/hello/"));
  const data = await res.text();
  expect(data).toBe("Hello world");
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

Major changes:

- New fully fledged `ctx.url` that extends [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) object inside `ctx` (also note: `ctx.url` is no longer a string):
  - `ctx.params` is now `ctx.url.params`, e.g. `ctx.url.params.id`.
  - `ctx.query` is now `ctx.url.query`, e.g. `ctx.url.query.search`.
  - `ctx.path` is now `ctx.url.path` (or `ctx.url.pathname`).
  - All URL properties are available, like `ctx.url.port`, `ctx.url.searchParams`, etc.

## Progress

- Router has all verbs, as well as URL pattern matches
- Full URL parsing, including `query` and `params` in ctx.url.
- Body and Files parsing is working (need testing)
- The middleware can return:
  - A number and it'll be set as the status code
  - A string and it'll be sent as plain text or html (if it starts with "<")
  - A readStream and it'll be piped to the response
  - An object with `status`, `body` and `headers` and it'll be set raw.
- Response compression works

## Some plugins

> This question is just some concepts/ideas

Plugins? Or internals?

```js
import Bucket from 'bucket/s3';
import Redis from 'redis';

const bucket = Bucket('my-bucket', { id, key });
const cache = Redis('my-redis', ...);

const app = server({ public: bucket, uploads: bucket, cache });

app([
  post('/uploads', ctx => {
    // Without { public: bucket }, it'd be a local file in the filesystem
    console.log(ctx.files.profile);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size

    // With { public: bucket }, it's the reference to the bucket file
    console.log(ctx.files.profile);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size
  })
]);
```

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

```js
import server, { jwtAuth } from "server";
import BookRouter from "./BookRouter";
import UserRouter from "./UserRouter";

export default server({ port: 3000 })
  .use(jwtAuth)
  .route("/users", UserRouter)
  .route("/books", BookRouter);
```

```js
// UserRouter.js -> A custom router
import server, { router } from "server";

export default router()
  .get("/", getUsers)
  .get("/:id", getUser)
  .post("/", createUser);
```

MAYBE?

```js
// BookRouter.js -> a REST API router
import { RestRouter } from "server";

export default class BookRouter extends RestRouter {
  async create(ctx) {
    // POST /
  }
  async list(ctx) {
    // GET /
  }
  async get(ctx) {
    // GET /:id
  }
  async search(ctx) {
    // GET /?...
  }
  async update(ctx) {
    // PUT /:id
  }
  async set(ctx) {
    // PATCH /:id
  }
  async delete(ctx) {
    // DELETE /:id
  }
  async error(ctx) {
    // ctx.error
  }
}
```
