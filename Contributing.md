# Contributing

## Development

```bash
bun test           # run the test suite
npx tsc --noEmit   # type-check
npm run build      # bundle index.js + index.d.ts
```

## Writing docs

These rules apply to the reference sections (`options.*`, `ctx.*`, the reply
helpers, the router methods, the auth callbacks). Guide pages (Documentation,
Concepts, the tutorials, FAQ) are narrative and follow their own flow.

### Section structure

Every reference section follows the same shape, and the first code block
appears within the first few lines, before any detailed explanation:

````md
## options.thing

One short sentence saying what it does, and its default when relevant.

```js
server({ thing: '1h' });  // 1-3 lines, the shorter the better; more lines
server({ thing: false }); // only to show a genuinely different form
```

One short paragraph of description: the behavior, how the forms relate, what
the defaults mean. When the value is an object, its fields come right here as
a table, so nobody has to guess what can go in it:

| Field | Type | Description |
|-------|------|-------------|
| `option` | `string` | What it does and its default |

```js
// A longer, realistic example a user would actually copy
```

Each important gotcha gets its own short paragraph, with a small code block
when showing beats telling. Use a callout when it must not be missed:

> [!WARNING]
> The thing that bites people who skim.

### Examples

Optional: standalone copy-paste recipes, only when they don't fit as the
realistic example above. Skip the heading for small sections.

### See also

- [`related()`](#related): one line on why you'd go there.
````

The ref block is reference-like only, never a mini-example: bare forms with a
trailing comment each, no routes or context around them.

### Code examples

Examples show the patterns we want users to copy:

- Hold your own reference to the things you configure (a bucket, a store) and
  use that reference in routes. Don't reach for `ctx.options` to get them
  back out:

```js
// Yes
const uploads = bucket.FS('./uploads');
export default server({ uploads })
  .get('/file/:id', (ctx) => uploads.file(ctx.url.params.id));

// No
export default server({ uploads: './uploads' })
  .get('/file/:id', (ctx) => ctx.options.uploads.file(ctx.url.params.id));
```

`ctx.options` is the resolved internal settings; its shape is not something
examples should teach users to depend on. Use it only in the docs that
specifically document `ctx.options` itself.
