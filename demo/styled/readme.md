# Styled

Component-scoped CSS in about 200 lines, with no dependencies. Every rule the
page uses is collected while it renders and injected into its `<head>`; there
is no stylesheet to serve and nothing to build.

```bash
bun install && bun run dev
```

```jsx
const Title = styled.h1`
  font-size: 2rem;
  color: tomato;
`;

export default server().get("/", () => (
  <Styles>
    <html>
      <head><title>Styled</title></head>
      <body><Title>Hello</Title></body>
    </html>
  </Styles>
));
```

## What it does

**Props drive the CSS.** A `$`-prefixed prop feeds the template and is dropped
before the element is rendered, so it never reaches the HTML:

```jsx
const Button = styled.button`
  background: ${(p) => (p.$primary ? "tomato" : "white")};
`;
```

**A component is a selector.** Interpolating one resolves to its class, which
is what makes CSS-only interactivity possible:

```jsx
const Menu = styled.nav`max-height: 0;`;
const Toggle = styled.input`&:checked ~ ${Menu} { max-height: 10rem; }`;
```

**Extending folds into one class**, base rules first so the extension wins:

```jsx
const Next = styled(Button)`&::after { content: " \2192"; }`;
```

**Fragments carry their own rules.** A response with no `<head>` gets its CSS
inlined in front of it, which is what an htmx swap needs. See `/fragment`.

Nesting, `&` and `@media` are passed through untouched, since browsers do
native CSS nesting now.

The library itself lives in [`lib/`](./lib), with its own readme and tests.

## What it does not do

No vendor prefixing, no theming, no client-side runtime. If you want those,
[`styled-components`](../styled-components) is next door, wired up the same way.

## Why it is safe to keep the rules in a module

Rendering is synchronous: the JSX runtime contains no `await`, so nothing can
interleave between one page starting and its rules being read back. The
framework rejects async components, which is what holds that up.

`<Styles>` reads the rules and clears them, rather than resetting first. That
ordering is what lets it be a component at all: the runtime renders an
element's children as the JSX is built, so by the time `<Styles>` runs, its
children have already registered everything they need.

The one rule that follows: **every page ends in a `<Styles>`**, since that is
what empties the set. A page that renders styled components without one leaves
them behind for whichever page collects next.
