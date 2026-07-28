# Contributing

## Development

```bash
bun test           # run the test suite
npx tsc --noEmit   # type-check
npm run build      # bundle index.js + index.d.ts
```

## Code examples in docs

Examples show the patterns we want users to copy:

- Hold your own reference to the things you configure (a bucket, a store) and use that reference in routes. Don't reach for `ctx.options` to get them back out:

  ```js
  // Yes
  const uploads = FileSystem('./uploads');
  export default server({ uploads })
    .get('/file/:id', (ctx) => uploads.file(ctx.url.params.id));

  // No
  export default server({ uploads: './uploads' })
    .get('/file/:id', (ctx) => ctx.options.uploads.file(ctx.url.params.id));
  ```

  `ctx.options` is the resolved internal settings; its shape is not something examples should teach users to depend on. Use it only in the docs that specifically document `ctx.options` itself.
