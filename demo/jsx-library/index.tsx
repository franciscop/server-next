import server, { cache, file } from "../..";
import Markdown from "llmrender";

// `llmrender` is a real third-party React library, published as compiled JS
// that imports "react/jsx-runtime". This app's package.json aliases `react` to
// `@server/next`, so those imports resolve to Server's JSX runtime and its
// components render as HTML here, with no React installed.

const DOC = `
# Markdown, rendered by a React library

This page is produced by [llmrender](https://www.npmjs.com/package/llmrender),
a Markdown renderer written for React, running on Server's JSX.

## What works

- **Bold**, _italic_ and \`inline code\`
- Lists, links and tables
- Its components nest inside ours, and ours inside theirs

| Piece            | Comes from   |
| ---------------- | ------------ |
| The page shell   | this app     |
| The article body | llmrender    |

\`\`\`js
export default server().get("/", () => <Markdown>{text}</Markdown>);
\`\`\`
`;

const Page = ({ children }: { children?: unknown }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Third-party JSX</title>
      <link rel="stylesheet" href="/theme.css" />
      <style>{`
        body { font-family: system-ui; max-width: 42rem; margin: 3rem auto; padding: 0 1.5rem; }
      `}</style>
    </head>
    <body>{children}</body>
  </html>
);

export default server()
  // Their component inside ours
  .get("/", () => (
    <Page>
      <Markdown>{DOC}</Markdown>
    </Page>
  ))
  // ...and rendered to a plain string by hand, with no server involved
  .get("/fragment", () => (<Markdown>{"### Just the HTML"}</Markdown>)())
  // The library ships its own themes
  .get("/theme.css", { schema: false }, () =>
    cache("1h").file(`${import.meta.dir}/node_modules/llmrender/themes/default.css`),
  );
