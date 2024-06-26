# Documentation

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

It includes all the things you would expect from a modern Server framework, like routing, static file serving, body+file parsing, gzip+brotli, streaming, testing, error handling, websockets, etc. We also have integrations with these, and adaptors for others are really easy:

- KV Stores: in-memory, Redis, Consul, DynamoDB.
- Buckets: AWS S3, Cloudflare R2, Backblaze B2.
- Validation libraries: Zod, Joi, Yup, [Validate](https://validatejs.org), etc.
- Auth: JWT, Session, Cookies

```js
// How to test your server - index.test.js
import app from "./";

it("can retrieve the homepage", async () => {
  const res = await app.fetch(new Request("http://localhost:3000/books"));
  const books = await res.json();

  expect(res.status).toBe(200);
  expect(books[0]).toEqual({ id: 0, name: 'The Catcher In The Rye', ... });
});
```

## Introduction

### Getting started

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

### Basic usage

Now that you know how to create a barebones server, there are some important bits that you might want to update.

`SECRET`: create an `.env` file (ignored in git with `.gitignore`) with the `SECRET=` and then a very long, unique random secret. Best is a long random string. It will be used to sign and/or encrypt things as needed.

`store`: almost anything you want to persist will need a KV store to do so. For dev you can use an in-memory or a file-based (easy for debugging!) store, but for production systems you would normally use something like Redis.

> Note: `bucket` is still _not_ available

`bucket`: if you want to accept user files you will need a place to persist them. By default they are put in the filesystem, but since most cloud providers are ephemeral, provide a `bucket` and it will be used to handle the files directly.

An example of how that works in practice:

```js
// index.js
import server from "@server/next";

import Bucket from "bucket/b2";
import Store from "polystore";
import { createClient } from "redis";

const bucket = Bucket("mybucketname", { id, key });
const store = Store(createClient("...").connect());

export default server({ bucket, store })
  .get("/", () => "Hello world")
  .post("/", (ctx) => {
    console.log(ctx.body);
    return 201;
  });
```

> Note: the `polystore` project _wraps_ other libraries to provide a unified API, while the `bucket` project directly interacts with the different third party APIs so you only import the one you need.

### Middleware

## Guides

### Validation

### Stores

### File handling

## Options

Options docs here

## Router

Router docs here

## Context

Context docs here

## Reply

Reply docs here
