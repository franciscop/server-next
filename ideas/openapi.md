# OpenAPI

> This is part of the "Ideas", early thoughts not yet, or only partially, implemented to explore different ideas to see what works best.

Routes already carry validation schemas (`body`, `query`, `params`, `response`,
any Standard Schema library) plus `tags`, `title` and `description`, and the
`openapi` option serves a spec built from them. What's left here is making that
spec richer.

## Non-zod spec generation

Validation is universal (Standard Schema), but spec generation still reads zod
internals (`zodToSchema` in `src/middle/openapi.ts`); other vendors degrade to
`type: "string"`. Standard Schema has no introspection API, so this needs
per-vendor adapters (valibot and arktype expose their own metadata) or a
schema-to-JSON-Schema effort from the spec side, if one lands.

## Growing the `schema` route option

`schema` already carries `tags`, `title` and `description` (implemented).
Anything else that's spec-only belongs under the same key, instead of growing
more top-level options:

```js
.post('/users', {
  body: UserSchema,
  response: UserSchema,
  schema: {
    title: 'Create new user',
    // examples, component names, per-status descriptions, ...
  },
}, handler)
```

Validation keys stay top-level (they affect the request); `schema` is inert
metadata that only the spec reads.
