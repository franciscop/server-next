---
title: Where middleware falls short
description: Middleware chains are great until you need to know what runs, in what order, and why. Here is where the pattern breaks down and what we do instead.
date: 2026-08-09
---

> [!WARNING]
> This is just a rambling for now

# Where middleware falls short

I love middleware, I've used Express for ages and love how flexible and powerful it is. I first encountered it with Express' "Connect".

But I've also for 10 years maintained `server` and been writing the `v2` of it, and thinkingn a lot about middleware and more professional software.

## Advantages

The chain is the contract. We have a running `req` and `res`, that have a lot of configuration and data already built in, and any middleware can respect it.

## Disadvantages

It's hard to do any introspection in middleware. WTF does that mean? If you have this middleware:

```js
express().post('/users', validate(SomeSchema));
```

While it works at runtime as expected, it's very hard for _the framework_ to know what's happening or how we're doing validation. This is fine for everyday applications, but when we want to have a more robust system we'd want to be generating things like an OpenAPI schema, handle validation errors at scale, generate the types more strictly, etc.

These are all not really possible with the very flexible plain middleware.
