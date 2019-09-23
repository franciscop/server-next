# Contributing

Thanks for your interest!

I'm interested ATM on help with creating new serverless engines for (Amazon) AWS Lambda and (Google) GCP Functions. I've already created the basics of Node.js and Cloudflare Workers, so you can use this doc and those implementations as a guide.

## Engine specification [WIP!]

The engine will receive two parameters `engine(handler, options)`:

- `handler`: a mix of all the middleware into a single callback. This _must_ be called on each request with the appropriate [Context](#context).
- `options`: the user-specified options for server, after going through modification/cleanup.

But first of all, you must find out what is even the current engine! For that, add the detection script to `src/engine/index.js`.

### Context

When `handler` is called, it will accept a single parameter, the Context. Every engine should create a Context with the following properties:

- `url`: the fully quantified URL as in `http://localhost:3000/abc?def=ghi`.
- `method`: the request method.
- `headers`: a plain `Object` with all of the headers in _lowercase_.
- `ip`: the IP of the connecting client.
- [WIP] `req` or `request`: the native raw request for that engine.
- [WIP] `runtime` or `engine`: a string with the engine name.

These I'm not sure if they are responsibility of the engine or of the internal middleware:

- [WIP] `body`: the contents of the request. Might want to keep it in middleware because several engines might be the same. Let's see better when we have more engines.
- [WIP] `files`: same as above. _Note: is it even possible on Serverless?_

Some of the context for user code will be derived from these through internal middleware, so they **must not** be included in the engine:

- `protocol`: will be read from `url`.
- `path`: will be read from the `url`.
- `params`: will be read from the `url`.
- `query`: will be read from the `url`.
- `cookies`: will be read from `headers`. **NOTE: original docs mix `cookie` and `cookies`!**.
- `session`: these will be read from the options + `cookies`. This is going to be painful.
- [WIP] `secure`: do we need this? Can be derived from `protocol`.
- [WIP] `xhr`: do we need this? Can be derived from `X-Requested-With` header being `XMLHttpRequest`.

Every middleware inside `handler()` **might mutate the context**, so make sure each request creates a new deep context.

### Options

The user options. So far, no much info here, assume they are the same as the old ones.
