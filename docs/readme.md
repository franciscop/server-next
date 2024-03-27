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
  const res = await app.fetch(new Request("http://localhost:3000/books/"));
  const books = await res.json();
  expect(books[0]).toEqual({ id: 0, name: 'The Catcher In The Rye', ... });
});
```

## Introduction

### Getting started

### Basic usage

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
