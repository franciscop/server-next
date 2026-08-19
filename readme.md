# Server JS [![@server/next](https://img.shields.io/npm/v/@server/next?label=@server/next&color=greenlime)](https://www.npmjs.com/package/@server/next) [![tests](https://github.com/franciscop/server-next/workflows/tests/badge.svg)](https://github.com/franciscop/server-next/actions)

A modern web server for Bun and Node, with routing, authentication, uploads, WebSockets and testing built in.

```bash
npm install @server/next
```

```js
import server from '@server/next';

export default server({ uploads: './uploads' })
  .get('/', () => 'Hello world')
  .get('/users/:id', (ctx) => db.users.find(ctx.url.params.id))
  .post('/avatar', (ctx) => ctx.body.avatar.path);
```

Key-value stores and file storage come included, so logins work out of the box and `uploads` takes a folder path. For Redis, S3 and the rest, pass the client straight in:

```js
import server, { bucket, kv } from '@server/next';
import { createClient } from 'redis';

const redis = kv(createClient({ url }));
const uploads = bucket.S3('my-bucket', { id, key });

export default server({
  uploads,
  auth: {
    strategy: 'cookie',
    providers: ['github'],
    users: redis.prefix('user:'),
    sessions: redis.prefix('session:'),
  },
});
```

See the [full documentation](https://serverjs.io/documentation).
