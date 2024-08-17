# Documentation

> **⚠️ WIP** This is an **experimental library** right now!

A fully-fledged web server for Bun and Node.js, with all the basics built-in:

```js
import server from "@server/next";

export default server(options)
  .get("/books", () => Book.list())
  .post("/books", BookSchema, (ctx) => {
    return Book.create(ctx.body).save();
  });
```

It includes all the things you would expect from a modern Server framework, like routing, static file serving, body+file parsing, gzip+brotli, streaming, testing, error handling, websockets, etc.

We also have integrations and adaptors for these:

- KV Stores: in-memory, Redis, Consul, DynamoDB, [Level](https://github.com/Level/level).
- Buckets: AWS S3, Cloudflare R2, Backblaze B2.
- Validation libraries: [Zod](https://zod.dev/), [Joi](https://joi.dev/), [Yup](https://github.com/jquense/yup), [Validate](https://validatejs.org), etc.
- Auth: JWT, Session, Cookies, Social login.

```js
// How to test your server - index.test.js
import app from "./";
const api = app.test();  // Very convenient helper, AXIOS-like interface

it("can retrieve the book list", async () => {
  const { data: books } = await api.get("/books/");
  expect(books[0]).toEqual({ id: 0, name: ... });
});
```

## Getting started

First install it:

```
npm install @server/next
yarn add @server/next
bun install @server/next
```

Now you can create your first simple server:

```js
// index.js
import server from "@server/next";

export default server()
  .get("/", () => "Hello world")
  .post("/", (ctx) => {
    console.log(ctx.body);
    return 201;
  });
```

Then run `node .` or `bun .` and open your browser on http://localhost:3000/ to see the message.

There are some major configuration options that you might want to set up though, enumerated in the [Basic Usage](#basic-usage) and explained through the docs.

## Basic usage

Now that you know how to create a barebones server, there are some important bits that you might want to update.

`SECRET`: create an `.env` file (ignored in git with `.gitignore`) with the `SECRET=` and then a long, unique random secret. It will be used to sign and/or encrypt things as needed.

`store`: almost anything you want to persist will need a KV store to do so. For dev you can use an in-memory or a file-based (easy for debugging!) store, but for production systems you would normally use something like Redis. Can be as easy as `const store = new Map();` for dev.

> Note: `bucket` is still _not_ available

`bucket`: if you want to accept user files you will need a place to persist them. By default they are put in the filesystem, but since most cloud providers are ephemeral, provide a `bucket` and it will be used to handle the files directly.

An example of how that works in practice:

```js
// index.js
import server from "@server/next";

import Bucket from "bucket/b2";
import { createClient } from "redis";

const bucket = Bucket("mybucketname", { id, key });
const store = createClient("...").connect();

export default server({ bucket, store })
  .get("/", () => "Hello world")
  .post("/", (ctx) => {
    console.log(ctx.body);
    return 201;
  });
```

## Guides

### Middleware

### Validation

### Stores

### File handling

To manage files, you need to install and use the library [`bucket`](http://bucketjs.com/), which is a very thin wrapper for file management systems. It is also created by the makers of Server.js.

The easiest and default is to set a folder in your filesystem:

```js
import FileSystem from "bucket/fs";

const uploads = FileSystem("./uploads");

// All paths are relative to the CWD
export default server({ uploads })
  .get("/", () => "Hello")
  .put("/users/:id", async (ctx) => {
    // This is the plain string as the file name, already in our FS
    const fileName = ctx.body.profile;
    // 'yOuZEdSsNLq8PgZyLhSz0Llh.jpg'

    // Convert it into a File instance
    const file = ctx.uploads.file(fileName);

    // Now we can use other methods if we want
    // .info(), .read(), .write(), .pipe(), .pipeTo(), etc
    const info = await file.info();
    // {
    //    id: "yOuZEdSsNLq8PgZyLhSz0Llh.jpg",
    //    type: "jpg",
    //    size: 435435,
    //    timestamp: "2024-08-07T14:26:37Z",
    //    // Note: this can be customized providing the option "domain"
    //    url: "file:///Users/me/my-project/uploads/yOuZEdSsNLq8PgZyLhSz0Llh.jpg",
    // }

    return 200;
  });
```

To upload the files to a 3rd party system, you just need to use the corresponding `bucket` implementation (or write a thin compatibility layer). Let's see an example with Backblaze's B2:

```js
import server from "@server/next";
import Backblaze from "bucket/b2";

const uploads = Backblaze("bucket-name", {
  id: process.env.BACKBLAZE_ID,
  key: process.env.BACKBLAZE_KEY,
});

export default server({ uploads })
  .put("/users/:id", async (ctx) => {
    const fileName = ctx.body.profile;
    // 'yOuZEdSsNLq8PgZyLhSz0Llh.jpg'

    // Convert it into a File instance
    const file = ctx.uploads.file(fileName);

    // Now we can use other methods if we want
    const info = await file.info();
    // {
    //    id: "yOuZEdSsNLq8PgZyLhSz0Llh.jpg",
    //    type: "jpg",
    //    size: 435435,
    //    timestamp: "2024-08-07T14:26:37Z",
    //    url: "https://f???.backblazeb2.com/???/yOuZEdSsNLq8PgZyLhSz0Llh.jpg",
    // }

    return 200;
  });
  .;
```

#### Example: resizing the user profile picture

Let's see a complete example of uploading and resizing a user profile picture:

```js
import server, { status } from "@server/next";
import sharp from "sharp";
import FileSystem from "bucket/fs";

const uploads = FileSystem("./uploads");

// All paths are relative to the CWD
export default server({ uploads })
  .get("/", () => "Hello")
  .put("/users/:id", async (ctx) => {
    // Create the instance of the file to read and write
    const src = ctx.uploads.file(ctx.body.profile);
    const dst = ctx.uploads.file("/profile/" + ctx.url.params.id + ".jpg");

    const ext = src.id.split(".").pop();
    if (!["jpg", "jpeg", "png", "webp", "avif"].includes(ext)) {
      await src.remove(); // Don't store it
      return status(400).json({ error: "Invalid file format" });
    }

    // Create the Readable, Transform and Writable Node streams
    await pipeline(
      src.readable("node"),
      sharp().resize(200, 200).jpg(),
      dst.writable("node")
    );

    // We no longer need the original file
    await src.remove();

    return status(200).json({ updated: true });
  });
```

Note that the option `uploads` gets converted into a `Bucket` instance and passed as `ctx.uploads`. Th

## Options

Options docs here

## Router

Router docs here

## Context

Context docs here

## Reply

Reply docs here

## Runtimes

There are many runtimes where Server works! We put a lot of work to make sure it works the same way with minimal changes in them, this includes:

- Node.js of course, including everywhere that Node is supported (VPS, Heroku, Render, etc).
- Bun, and it will be even faster!
- Cloudflare Worker
- Netlify Function + Edge function

## FAQ

#### How is it different from Hono?

Server.js attempts to run your code unmodified in all runtimes. With Hono, despite the claims in their homepage, you need to change the code for different runtimes:

```js
// Server.js code for Node.js, Bun and Netlify
import server from "@server/next";
export default server().get("/", () => "Hello server!");
```

```js
// Hono code for Node.js
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Node.js!'))
serve(app)

// Hono code for Bun
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))
export default app

// Hono code for Netlify
import { Hono } from 'jsr:@hono/hono'
import { handle } from 'jsr:@hono/hono/netlify'
const app = new Hono()
app.get('/', (c) => c.text('Hello Hono!'))
export default handle(app)
```
