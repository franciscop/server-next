# Validation

> This is part of the "Ideas", early thoughts not yet, or only partially, implemented to explore different ideas to see what works best.

Fold request-body validation into the `body` option, so everything about the
body (how it's read, how big, and what shape) lives in one place instead of
adding more top-level `server({})` options or a separate positional argument.

## Shape

`body` already accepts a mode or `{ mode, max }` (implemented). Extend the union
with a schema:

```ts
type BodyOption =
  | BodyMode                       // 'parse' | 'raw' | 'stream'   (shorthand)
  | Schema                         // z.object(...) -> validate, in parse mode
  | { mode?: BodyMode; max?: number | string | false; validate?: Schema };

type Schema = { parse(v: unknown): unknown } | ((v: unknown) => unknown);
```

```js
.post('/users', { body: z.object({ name: z.string() }) }, h)      // validate
.post('/users', { body: { max: '1mb', validate: UserSchema } }, h) // + limit
```

Resolution: a string is `{ mode }`; a value with `.parse`/that is a function is
a schema, resolving to `{ mode: 'parse', validate }`; otherwise the full object.

## Guardrails (must enforce, or it's a footgun)

1. **`validate` implies `parse` mode.** In `stream`/`raw` there is no parsed
   object, so `{ mode: 'stream', validate: z.object(...) }` is contradictory and
   should be a config-time error, not silently ignored. A bare schema always
   means `mode: 'parse'`.
2. **`validate` is per-route, not a server default.** `mode`/`max` are
   meaningfully global-with-override; a global `body.validate` would validate
   every route's body against one schema, which is almost never wanted. Allowed
   by the type, but treat a global `validate` as a smell.

## Relationship to the current validation

There is already a validation path (`src/helpers/validate.ts`) invoked from
`handleRequest` when a schema is passed positionally
(`.post(path, schema, handler)`), throwing `StatusError` 422 on failure (Zod
`.parse` or a plain function). Deciding factor before building: **replace** the
positional schema with `body.validate`, **support both**, or keep positional and
make `body.validate` an alternative. Reuse the existing `validate.ts` engine and
the 422 behavior either way.

## Also worth folding in later
- `query` validation (there's already `schema.query` support in `validate.ts`),
  though that isn't a "body" concern so it may want its own home.
