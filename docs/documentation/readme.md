---
layout: docs.hbs
title: Server.js - Documentation
description: A library to easily create a modern Node.js server. Handles HTTP, Websockets and all the small details.
---

# Documentation

Server.js uses functions ([middleware](#middleware)) to handle the requests. It also accepts an options object as the first argument:

```js
// Import the library
import server from 'server';

// All of the arguments are optional
server(options, fn1, fn2, fn3, ...);
```



## Getting started

There's [a getting started tutorial for beginners](/tutorials/getting-started/). If you know your way around:

```bash
npm install server
```

Add the `"type": "module"` to your `package.json` since we use ESM:

```json
{
  "name": "my-package1",
  "type": "module",
  ...
}
```

Create some demo code in your `index.js`:

```js
// Answers to any request with "Hello world"
import server from 'server';
server(ctx => 'Hello world');
```

Finally run the example from the terminal:

```bash
node .
```

Open your browser on [localhost:3000](http://localhost:3000/) to see the response in your browser.



## Basic usage

Some of the components are the main function on itself, [router](/documentation/router/) and [reply](/documentation/reply/). The main function accepts first an optional object for [the options](/documentation/options/), and then as many [middleware](#middleware) or arrays of middleware as wanted:

```js
import server from 'server';

server({ port: 3000 }, ctx => 'Hello 世界');
```

To use the router and reply extract their methods as needed:

```js
import server from 'server';
const { get, post } = server.router;
const { render, json } = server.reply;

server([
  get('/', ctx => render('index.hbs')),
  post('/', ctx => json(ctx.data)),
  get(ctx => status(404))
]);
```



## Middleware

A *middleware* is a plain function that will be called on each request. It receives [a context object](/documentation/context) and [returns a reply](/documentation/reply/), a [basic type](/documentation/reply/#return-value) or nothing. A couple of examples:

```js
const setname = ctx => { ctx.user = 'Francisco'; };
const sendname = ctx => send(ctx.user);
server(setname, sendname);
```

They can be placed as `server()` arguments, combined into an array or imported/exported from other files:

```js
import commentsRouter from './comments/router.js';

server(
  ctx => send(ctx.user),
  [ ctx => console.log(ctx.data) ],
  commentsRouter
);
```

Then in `./comments/router.js`:

```js
import server from 'server';
const { get, post, put, del } = server.router;
const { json } = server.reply;

export default [
  get('/',    ctx => { /* ... */ }),
  post('/',   ctx => { /* ... */ }),
  put('/:id', ctx => { /* ... */ }),
  del('/:id', ctx => { /* ... */ }),
];
```


The main difference between synchronous and asynchronous functions is that you use  `async` keyword to then be able to use the keyword `await` within the function, avoiding [callback hell](http://callbackhell.com/). Some examples of middleware:

```js
// Some simple logging
const mid = () => {
  console.log('Hello 世界');
};

// Asynchronous, find user with Mongoose (MongoDB)
const mid = async ctx => {
  ctx.user = await User.find({ name: 'Francisco' }).exec();
  console.log(ctx.user);
};

// Make sure that there is a user
const mid = ctx => {
  if (!ctx.user) {
    throw new Error('No user detected!');
  }
};

// Send some info to the browser
const mid = ctx => {
  return `Some info for ${ctx.user.name}`;
};
```

In this way you can `await` inside of your function. Server.js will also await to your middleware before proceeding to the next one:

```js
server(async ctx => {
  await someAsyncOperation();
  console.log('I am first');
}, ctx => {
  console.log('I am second');
});
```

If you find an error in an async function you can throw it. It will be caught, a 500 error will be displayed to the user and the error will be logged:

```js
const middle = async ctx => {
  if (!ctx.user) {
    throw new Error('No user :(');
  }
};
```

> **Avoid callback-based functions**: error propagation is problematic and they have to be converted to promises. async/await workflows are better.



## Express middleware

Server.js is using express as the underlying library (we <3 express!). You can import middleware designed for express with `modern`:

```js
import server from 'server';
import Helmet from 'helmet';

// Initialize it with some options
const legacy = Helmet({ ... });

// Convert it to server.js middleware
const mid = server.utils.modern(legacy);

// Add it as you'd add a normal middleware
server(mid, ...);
```

> Note: the `{ ... }` represent the options for that middleware since many of [express libraries](https://expressjs.com/en/guide/writing-middleware.html) follow the [factory pattern](https://github.com/expressjs/express/issues/3150).

Or you can keep the whole middleware in a separated file/folder:

```js
// index.js
import server from 'server';
import middleware from './middleware.js';
import routes from './routes.js';

server(middleware, routes);
```

Then in our `middleware.js`:

```js
// middleware.js
import server from 'server';
import Middleware1 from 'express-mid-1';
import Middleware2 from 'express-mid-2';

const { modern } = server.utils;

export default [
  modern(Middleware1({ /* ... */ })),
  modern(Middleware2({ /* ... */ }))
];
```

Read the next section for a great example of a common middleware from express used with server.


## CORS

To allow requesting a resource from another domain you must enable [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS). To do so, you have two options: do it manually or through a great library. Both of them end up setting some headers.

Let's see how to do it manually for any domain:

```js
import server from 'server';
const { header } = server.reply;  // OR server.reply;

const cors = [
  ctx => header("Access-Control-Allow-Origin", "*"),
  ctx => header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"),
  ctx => header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE, HEAD"),
  ctx => ctx.method.toLowerCase() === 'options' ? 200 : false
];

server({}, cors, ...);
```

If you want to whitelist some domains it's not easy manually, so we can use the great package [`cors` from npm](https://www.npmjs.com/package/cors):

```js
import server from 'server';
import Cors from 'cors';

// Load it with the options
const corsExpress = Cors({
  origin: ['https://example.com', 'https://example2.com']
});

// Make the express middleware compatible with server
const cors = server.utils.modern(corsExpress);

// Launch the server with this specific middleware
server({}, cors, ...);
```



## Routing

This is the concept of redirecting each request to our server to the right place. For instance, if the user requests our homepage `/` we want to render the homepage, but if they request an image gallery `/gallery/67546` we want to render the gallery `67546`.

For this we will be creating routes using server's routers. We can import it like this:

```js
import server from 'server';
const { get, post } = server.router;
```

There are some other ways, but these are the recommended ones. Then we say the path of the request for the method that we want to listen to and a middleware:

```js
const getHome = get('/', () => render('index.pug'));
const getGallery = get('/gallery/:id', async ctx => {
  const images = await db.find({ id: ctx.params.id }).exec();
  return render('gallery.pug', { images });
});
```

Let's put it all together to see how they work:

```js
import server from 'server';
const { get, post } = server.router;

const getHome = get('/', () => render('index.pug'));
const getGallery = get('/gallery/:id', async ctx => {
  const images = await db.find({ id: ctx.params.id }).exec();
  return render('gallery.pug', { images });
});

server(getHome, getGallery);
```

We can also receive `post`, `del`, `error`, `socket` and other request types through the router. To see them all, visit the Router documentation:

<a href="/documentation/router" class="button">Router Documentation</a>






## Advanced topics

There is a lot of basic to mid-difficulty documentation to do until we even get here. Just a quick note so far:

The main function returns a promise that will be fulfilled when the server is running and can be accessed. It will receive a more primitive context. So this is perfectly valid:

```js
server(ctx => 'Hello world').then(ctx => {
  console.log(`Server launched on http://localhost:${ctx.options.port}/`);
});
```
