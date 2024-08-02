### Uploading Files

> This question is just some concepts/ideas

Plugins? Or internals?

```js
import Bucket from 'bucket/s3';
import Redis from 'redis';

const uploads = Bucket('my-bucket', { id, key });
const store = Redis('my-redis', ...);

const app = server({ public: 'public', uploads, store })
  .post('/uploads', ctx => {
    // Without { uploads: bucket }, it'd be a local file in the filesystem
    console.log(ctx.body.profile);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size

    // With { uploads: bucket }, it's the reference to the bucket file
    console.log(ctx.body.profile);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size
  });
```
