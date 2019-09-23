# Server.js

New implementation from scratch. This version has these changes when compared with the 1.0 (WIP):

- Tiny footprint with no dependencies, all bundled in a single file. Installing and using the full library takes under 10kb (target limit).
- Faster! Reimplemented from scratch for speed. With raw ES7 and a tiny code footprint, your server will fly.
- Modern ES6 syntax for both the library and examples.
- Error handling improved greatly.
- Compatible with Cloudflare Workers so you can run the same code on Node.js or on a Worker.
- Not using express underneath anymore. Considering keeping the compatibility layer anynway (since Express itself is a thin layer).
- Changed the reply logic greatly, including the removal of `render()`. This is the main reason express was removed. Many servers don't need render() at all.
- **[security]** Removed mandatory CSRF token, since this is only useful for server-rendered pages and not for SPA. You can activate it with a single option as before.

Conceptually, the world is moving out of server-rendered websites so we are as well. Now instead we treat APIs as first-class citizens.

```js
// It will be published under `server` in the future
import server, { get, post } from "@server/next";

server(
  get("/", () => `Homepage works! Try '/users/abc'`),
  get("/users/:id", ({ params }) => `The user is ${params.id}`),
  post("/api/users", () => ({ id: "abc", name: "Francisco" }))
);
```

## Demo

Create a directory, initialize npm and install `@server/next`:

```bash
mkdir server-demo && cd server-demo
npm init --yes
npm install @server/next
```

Create a `index.js` with a home route and a path route:

```js
import server, { get } from "@server/next";

server(
  get("/", ctx => `Hello there!`),
  get("/:path", ctx => `Visited "${ctx.params.path}"`)
).then(ctx => console.log(`Running on ${ctx.runtime}`));
```

Modify `package.json` to add `"type": "module"` (for that nice `import` syntax) and a `start` script:

```json
"main": "index.js",
"type": "module",
"scripts": {
  "start": "node --experimental-modules index.js"
},
```

Start it with `npm start` and visit http://localhost:3000/ 🎉

## Building for Cloudflare

If you also want to build it (for example, for Cloudflare Workers) you can build it with `rollup`. Please see more info [in Cloudflare's official documentation](https://developers.cloudflare.com/workers/archive/writing-workers/using-npm-modules/).


## TODO

New guides coming:

- Modify all documentation to use the new ES6 syntax. Explain how to bundle and run it.
- Consider other serverless architectures.
- How to even test? Create a test suite that makes requests.


## Engine specification [WIP!]

The engine will receive two parameters `engine(handler, options)`:

- `handler`: a mix of all the middleware into a single callback. This *must* be called on each request with the appropriate [Context](#context).
- `options`: the user-specified options for server, after going through modification/cleanup.

### Context

When `handler` is called, it will accept a single parameter, the Context. Every engine should create a Context with the following properties:

- `url`: the fully quantified URL as in `http://localhost:3000/abc?def=ghi`.
- `method`: the request method.
- `headers`: a plain `Object` with all of the headers in *lowercase*.
- `ip`: the IP of the connecting client.
- [WIP] `req` or `request`: the native raw request for that engine.
- [WIP] `runtime` or `engine`: a string with the engine name.

These I'm not sure if they are responsibility of the engine or of the internal middleware:

- [WIP] `body`: the contents of the request. Might want to keep it in middleware because several engines might be the same. Let's see better when we have more engines.
- [WIP] `files`: same as above. *Note: is it even possible on Serverless?*

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


## Others

Random thoughts and ramblings:

- Consider normalizing a `kv` store sorf-of, which would be very useful for both sessions and user-code. Right now we are using/supporting Redis.
