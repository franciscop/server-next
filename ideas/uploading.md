### Uploading Files

> This question is just some concepts/ideas

Plugins? Or internals?

```js
import Bucket from 'bucket/s3';
import kv from 'polystore';
import { createClient } from 'redis';

const uploads = Bucket('my-bucket', { id, key });
const store = kv(createClient());

const app = server({ public: 'public', uploads, store })
  .post('/uploads', ctx => {
    // Without { uploads }, it'd be a local file in the filesystem
    console.log(ctx.body.profile);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size

    // With { uploads }, it's the reference to the bucket file
    console.log(ctx.body.profile);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size
  });
```

How to modify it before? e.g. with Sharp:

```js
const uploads = Bucket('my-bucket', {
  // ...
  maxSize,
  minSize,
  validate,
  
});
```

## Requirements

The straightforward case should be very easy, just something like this:

```js
import S3 from 'bucket/s3';
const uploads = S3(...);

export default server({ uploads });
````

We need to allow to set up (fairly advanced) validation, both like `maxSize` and `fileType`, but also like `validate = file => ...`.

We need to allow piping somehow, to allow for things like Sharp transformation of images before they are written at the destination. This probably needs to be combined with validation (cannot pipe a .csv into Sharp).

We need to allow for different methods to set up some limitations independently, e.g. the profile picture limit might be 1MB, but the OCR PDF might be 10MB.


## Examples

### Local and pipe

First receive the file in our local filesystem, then pipe it to S3:

```js
import Bucket from "bucket";

const s3 = Bucket(...);

// 
const uploads = "./uploads/";

export default server({ uploads }).post("/profile", ctx => {
  ctx.body.profilePicture.pipeTo(s3.file("demo.png").writable());
});
```

### Upload directly to S3

Use the bucket directly for uploads

```js
import Bucket from "bucket";

const uploads = Bucket(...);

export default server({ uploads }).post("/profile", ctx => {
  console.log(ctx.body.profilePicture);
  // file.name
  // file.id
  // file.path
  // file.type
  // file.size
});
```

### Transform while uploading

Use a bucket transformation to make some modification before uploading.

Does it make more sense to add these _inside_ Bucket? Like this:

```js
import Bucket from "bucket";

const uploads = Bucket(..., {
  transform: TransformStream.toWeb(sharp.size(64)),   // Transform it to 64x64
});

export default server({ uploads }).post("/profile", ctx => {
  console.log(ctx.body.profilePicture);
  // file.name
  // file.id
  // file.path
  // file.type
  // file.size
});
```

Pros/Cons:
+ streamlined
+ easy to standardize
- this is for writing Request => Transform => Write, why is it _inside_ the Write? Bucket does other things

Have it inside the options of Server:

```js
import Bucket from "bucket";

const uploads = {
  bucket: Bucket(...),
  transform: TransformStream.toWeb(sharp.size(64)),   // Transform it to 64x64
};

export default server({ uploads }).post("/profile", ctx => {
  console.log(ctx.body.profilePicture);
  // file.name
  // file.id
  // file.path
  // file.type
  // file.size
});
```

Pros/Cons:
+ Bucket remains pure and doing what it's supposed to do
+ No ambiguity inside Bucket
+ No confusion with "public" or "views", since these don't write
- The signature is very weird, having a "bucket" but also some "options" besides it
- It's very different from Polystore


### Validate before uploading

Create some validation before uploading.

We can have these options inside Bucket:

```js
import Bucket from "bucket";

const uploads = Bucket(..., {
  // Static validation
  maxSize: '42mb',
  minSize: '1mb',
  fileType: ['.jpg', 'image/png'],  // extension and/or mime, they DO behave differently

  // Dynamic validation
  validate: file => {
    
  }
});

export default server({ uploads }).post("/profile", ctx => {
  console.log(ctx.body.profilePicture);
  // file.name
  // file.id
  // file.path
  // file.type
  // file.size
});
```

Or as we saw before, as a side in Server options:

```js
import Bucket from "bucket";

const uploads = {
  bucket: Bucket(...),

  // Static validation
  maxSize: '42mb',
  minSize: '1mb',
  fileType: ['.jpg', 'image/png'],  // extension and/or mime, they DO behave differently

  // Dynamic validation
  validate: file => {
    
  }
};

export default server({ uploads }).post("/profile", ctx => {
  console.log(ctx.body.profilePicture);
  // file.name
  // file.id
  // file.path
  // file.type
  // file.size
});
```

Another option is to have the option `onUpload`, but this requires a lot of manual configuration:

```js
import Bucket from "bucket";

const uploads = Bucket(...);

const onUpload = file => {

  // Static validation
  maxSize: '42mb',
  minSize: '1mb',
  fileType: ['.jpg', 'image/png'],  // extension and/or mime, they DO behave differently

  // Dynamic validation
  validate: file => {
    
  }
};

export default server({ uploads }).post("/profile", ctx => {
  console.log(ctx.body.profilePicture);
  // file.name
  // file.id
  // file.path
  // file.type
  // file.size
});
```

### Global and local handlers

We should be able to define a global handler, but also local handlers:

```js
import S3 from 'bucket/s3';
import FS from 'bucket/fs';

const fs = FS("./uploads/");
const s3 = S3("profile-pics");
const temp = FS("./tmp/");

const uploads = { bucket: fs, maxSize: "20mb" };
const profileUploads = { bucket: s3, maxSize: "10mb" };
const tempUploads = { bucket: temp, maxSize: "10mb" };

export default server({ uploads })
  .post("/profile", { uploads: profileUploads }, ctx => {
    console.log(ctx.body.profilePicture);
    // file.name
    // file.id
    // file.path
    // file.type
    // file.size
  })
  .post("/ocr", { uploads: tempUploads }, ctx => {
    const results = await ctx.body.fileToOcr.pipeTo(ocrService);
    return results;
  });
```

But at that point, is it not better to just keep them into a single place, and _then_ pipe them?

```js
import S3 from 'bucket/s3';
import FS from 'bucket/fs';

const s3 = S3("profile-pics");
const uploads = FS("./tmp/");

export default server({ uploads })
  .post("/profile", ctx => {
    const pic = ctx.body.profilePicture;
    await pic.pipeTo(s3.file(pic.path).writable());
  })
  .post("/ocr", ctx => {
    const pic = ctx.body.fileToOcr;
    const results = await pic.pipeTo(ocrService);
    return results;
  });
```
