# Strip a trailing `[]` in urlencoded field names

Multipart already does it, urlencoded does not, so the same form posted two ways
produces two different bodies.

```
tags[]=a&tags[]=b   as application/x-www-form-urlencoded  ->  { "tags[]": ["a", "b"] }
tags[]=a&tags[]=b   as multipart/form-data                ->  { "tags": ["a", "b"] }
```

`docs/3. Context.md` already documents the stripped behavior for both, so shipping
this makes the docs correct rather than needing a doc change.

## Where

The strip lives in `startPart` in `src/body/bodyParts.ts`:

```js
const name = getMatching(headerStr, /name="(.+?)"/).trim().replace(/\[\]$/, "");
```

The urlencoded path is `parseUrlEncoded` in `src/body/parseBody.ts`, which uses the
raw `URLSearchParams` key. `addField` in `bodyParts.ts` already handles collecting a
repeated name into an array for both paths, so only the key needs normalizing.

## Worth deciding

Whether `?tags[]=a` in the query string should follow. Query parsing is a separate
path (`define(url, "query", ...)` in `src/context/create.ts`, straight from
`URLSearchParams`), and PHP-style bracket syntax in query strings is a deeper hole
(`a[b][c]=1`), so the narrow version is body-only.

Breaking for anyone currently reading `ctx.body["tags[]"]`.
