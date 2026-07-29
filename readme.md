# Server JS [![@server/next](https://img.shields.io/npm/v/@server/next?label=@server/next&color=greenlime)](https://www.npmjs.com/package/@server/next) [![tests](https://github.com/franciscop/server-next/workflows/tests/badge.svg)](https://github.com/franciscop/server-next/actions)

A modern web server for Bun and Node, with routing, authentication, uploads, WebSockets and testing built in.

```bash
npm install @server/next
```

```js
import server from '@server/next';

export default server({ store: new Map(), uploads: './uploads' })
  .get('/', () => 'Hello world')
  .get('/users/:id', (ctx) => db.users.find(ctx.url.params.id))
  .post('/avatar', (ctx) => ctx.body.avatar.path);
```

Key-value stores and file storage come included, so `store` takes a plain `Map` and `uploads` takes a folder path. For Redis, S3 and the rest, `kv` and `bucket` are exported too:

```js
import server, { kv, bucket } from '@server/next';

const store = kv(createClient({ url }).connect());
const uploads = bucket.S3('my-bucket', { id, key });

export default server({ store, uploads });
```

See the [full documentation](https://serverjs.io/documentation).
