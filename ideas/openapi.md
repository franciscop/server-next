# OpenAPI

> This is part of the "Ideas", early thoughts not yet, or only partially, implemented to explore different ideas to see what works best.

The `openapi` option serves the spec built from the routes, their validation
schemas (any Standard Schema vendor, through each vendor's own JSON Schema
export) and their `schema` metadata. What's left is making that spec richer.

## Growing the `schema` route option

`schema` carries `tags`, `title` and `description` (implemented). Anything
else that's spec-only belongs under the same key, instead of growing more
top-level options:

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

## Shared components

Today every schema inlines into its operation. Registering repeated schemas
as named `components/schemas` entries (with `$ref`s at the use sites) would
shrink the spec and give codegen tools proper type names. Needs a way to name
a schema, which fits the `schema` key above (e.g. `schema: { name: 'User' }`
on the model, or reading zod's `.meta({ id })` when present).
