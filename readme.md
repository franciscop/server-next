> **VERY EARLY WORK IN PROGRESS**
>
> **I don't know what will come out of this, if anything! Treat as the most experimental thing you've ever seen**

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
  post("/users", () => ({ id: "abc", name: "Francisco" }))
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

- Modify all documentation to use the new ES6 syntax. Explain how to bundle and run it. Maybe create `npx @server/build`.
- Consider other serverless architectures.
- How to even test? Create a test suite that makes requests.



## Others

Random thoughts and ramblings:

- Consider normalizing a `kv` store sorf-of, which would be very useful for both sessions and user-code. Right now we are using/supporting Redis.
- Startup time is critical for serverless.
