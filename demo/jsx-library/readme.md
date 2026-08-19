# Third-party JSX libraries

Use a React component library with Server's JSX, no React installed. This demo
renders [llmrender](https://www.npmjs.com/package/llmrender), a real published
Markdown renderer written for React.

```bash
npm install
npm run dev   # bun with hot reloading; `npm start` for a plain run
```

Open http://localhost:3000/. The page shell is this app's JSX; the article
inside it is rendered by the library.

## How it works

A published JSX library ships **compiled** JavaScript, so its components are
no longer JSX: they are calls to `jsx()` imported from `react/jsx-runtime`.
llmrender's whole bundle imports exactly one thing:

```js
import { jsx, jsxs } from "react/jsx-runtime";
```

So nothing needs to understand React, that import just has to land somewhere
that speaks the same protocol. Two aliases do it, the same split Preact uses:

**1. The runtime**, in `package.json`. Point the `react` package at this one,
and `react/jsx-runtime` resolves through its exports to Server's runtime:

```json
"dependencies": {
  "react": "npm:@server/next"
}
```

(this demo uses `"react": "file:../.."` to test the local checkout instead)

**2. The types**, in `tsconfig.json`. Libraries import types from bare
`react` (`ReactNode`, `HTMLAttributes`, ...), which the runtime alias does not
cover, so map them at a small shim, `types/react.d.ts` here:

```json
"paths": {
  "react": ["./types/react.d.ts"]
}
```

The shim is types only; extend it when a library asks for something missing.

## Gotchas

- **Do not add a `paths` entry for `react/jsx-runtime`.** Bun applies tsconfig
  `paths` at runtime as well, so pointing it at a `.d.ts` breaks the real
  import. The package alias already covers that subpath for both.
- **React APIs are not implemented.** Hooks, context, `useState`, `refs` and
  anything client-side will fail. What works is the subset that matters for
  server-rendered HTML: components, props, children, fragments. Check what a
  library imports before reaching for it (`grep -o 'from"[^"]*"' index.min.js`);
  if it is only `react/jsx-runtime`, it will very likely work.
- **Async components are not supported** by the renderer, so a library
  component that awaits will not render.

## What to look at

- `package.json`: the runtime alias.
- `tsconfig.json` + `types/react.d.ts`: the type alias and its shim.
- `index.tsx`: their components nested in ours, plus `/fragment`, which calls
  the element to get the HTML string with no server involved.
