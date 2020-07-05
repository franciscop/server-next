---
layout: docs.hbs
title: Server.js Tutorials
description: A library to easily create a modern Node.js server. Handles HTTP, Websockets and all the small details.
---

# Tutorials

## Getting started

There's a [whole tutorial on getting started for beginners](https://serverjs.io/tutorials/getting-started/) but the quick version is to first install `server` as a dependency:

```bash
npm install server
```

Then you can create a file called `index.js` with this code:

```js
// Include the server in your file
const server = require('server');
const { get, post } = server.router;

// Handle requests to the url "/" ( http://localhost:3000/ )
server([
  get('/', ctx => 'Hello world!')
]);
```

```js
import server, { get, post } from "server";

server(
  get("/", () => "Hello world"),
  post("/users", ctx => {
    console.log(ctx.body, ctx.files);
    return 'ok';
  })
);
```

Execute this in the terminal to get the server started:

```bash
node .
```

And finally, open your browser on [localhost:3000](http://localhost:3000/) and you should see 'Hello world!' on your browser.
