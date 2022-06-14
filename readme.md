# Server @ Next

> **VERY EARLY WORK IN PROGRESS**
>
> **I don't know what will come out of this, if anything! Treat as the most experimental thing you've ever seen**

A fully-fledged web server for Node.js, with all the basics covered for you:

```js
import server, { get, post, put, use, error } from 'server';

// Create a running instance of the server
const app = server(config, [pluginA, pluginB]);

// Attach handlers to the instance
app([
  get('/users', getUsers),
  post('/users', createUser),
  put('/users/:id', editUser),
  use('/admin/*', dashboard),
  error(ctx => console.log(ctx.error))
]);
```

It includes all the things you would expect from a modern Server framework, like routing, static file serving, body+file parsing, gzip+brotli\*, streaming, etc.

> \* not yet available

## Upgradingn server

Why? The ecosystem is moving out of server-rendered websites so we are as well. Now instead we treat APIs as first-class citizens. Desired improvements (WIP!):

- Tiny footprint with no dependencies, all bundled in a single file. Installing and using the full library takes under 10kb (target limit).
- Faster! Reimplemented from scratch for speed. With raw ES6+ and a tiny code footprint, your server will fly.
- Modern ES6+ESM syntax for both the library and examples.
- Error handling improved greatly.
- Not using express underneath anymore. Considering keeping the compatibility layer anyway (since Express itself is a thin layer).
- Changed the reply logic greatly, including the removal of `render()`. This is the main reason express was removed. Many servers don't need render() at all.
- **[security]** Removed mandatory CSRF token, since this is only useful for server-rendered pages and not for SPA. You can activate it with a single option as before.


## Progress

- Router has all verbs, as well as URL pattern matches
- Full URL parsing, including `query` and `params` in ctx.url.
- Body and Files parsing is working (TODO: try with binary files and add tests)
- The middleware can return:
  - A number and it'll be set as the status code
  - A string and it'll be sent as plain text or html (if it starts with "<")
  - A readStream and it'll be piped to the response
  - An object with `status`, `body` and `headers` and it'll be set raw.


## Some plugins

> This question is just some concepts/ideas

Plugins? Or internals?

```js
import Bucket from 'bucket/s3';
import Redis from 'redis';

const bucket = Bucket('my-bucket', { id, key });
const cache = Redis('my-redis', ...);

const app = server({ public:  bucket, cache });

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
