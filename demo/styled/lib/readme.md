# styled

Component-scoped CSS for this framework's JSX, in ~260 lines with no
dependencies. Rules are collected while a page renders and injected into its
`<head>`; there is no stylesheet to serve and no build step.

## API

### `styled`

```jsx
const Title = styled.h1`font-size: 2rem;`;   // by tag
const Card = styled("article")`padding: 1rem;`;
const Loud = styled(Title)`color: tomato;`;  // extend another
const Boxed = styled(SomeComponent)`border: 1px solid;`;
```

Extending emits **one** class holding both sets of rules, base first so the
extension overrides it. The extension keeps the base's element, so extend a
component built on the tag you want, or override it per use with `as`.

Any component can be styled, as long as it puts the `class` it receives onto an
element. That one renders `<SomeComponent class="...">` rather than inlining,
since there is no way to know what element it will produce.

### `as`

Renders a different element with the same styles, for when the right tag is a
property of the position rather than of the component:

```jsx
<Title as="h2">Section</Title>
```

It never reaches the HTML. A component works too, and receives the class the
same way a wrapped one does.

### Props

A `$`-prefixed prop feeds the CSS and never reaches the HTML:

```jsx
const Button = styled.button`
  background: ${(p) => (p.$primary ? "tomato" : "white")};
`;
```

Each distinct value gets its own class. A component whose CSS reads props has
no fixed class, so it cannot be interpolated as a selector.

That suits a prop with a few outcomes. For one that varies per element, put
the value in a custom property instead, so the rule stays constant:

```jsx
const Bar = styled.div`
  width: var(--width);
  &:hover { width: calc(var(--width) * 1.1); }
`;

<Bar style="--width:40%" />;
```

One rule however many bars you render, where reading the prop from the CSS
mints a class per width. Unlike setting `width` inline, it reaches the
pseudo-class too. Custom properties inherit, so a nested component reading
`var(--width)` picks up an ancestor's value when it has none of its own.

### Interpolating a component

A component with fixed CSS resolves to its own selector, which is what makes
CSS-only interactivity possible:

```jsx
const Menu = styled.nav`max-height: 0;`;
const Toggle = styled.input`&:checked ~ ${Menu} { max-height: 10rem; }`;
```

### `global`

Rules that cannot belong to a class: element defaults, `@font-face`. Registered
once at import and emitted on every full page, ahead of the scoped rules.

```jsx
global`body { margin: 0; }`;
```

### `keyframes`

Returns a generated name to interpolate into an `animation`. Named after its
own body, so identical animations collapse and different ones never collide.
Ships with the globals, since like them it is defined once at import.

```jsx
const spin = keyframes`from { rotate: 0deg; } to { rotate: 360deg; }`;
const Loader = styled.div`animation: ${spin} 1s linear infinite;`;
```

### `<Styles>`

Wraps a page and injects everything it used. **Every page must end in one**,
since that is what empties the collection for the next.

```jsx
<Styles>
  <html>...</html>
</Styles>
```

With a `<head>` it inserts a `<style>` before `</head>`, globals first. Without
one (a fragment, an htmx swap) it puts only that fragment's own rules in front
of the markup, and skips the globals, which belong to the document the fragment
is being swapped into.

Nesting, `&` and `@media` are passed through untouched, since browsers do
native CSS nesting.

## How it works

Rules go into a module-level `Set` as components render, and `<Styles>` reads
and clears it. Three properties of this framework's renderer make that safe,
and none of them holds in a React-like runtime:

**Rendering is synchronous.** The JSX runtime contains no `await`, so nothing
can interleave between a page rendering and its rules being read. The framework
rejects async components, which is what holds this up.

**Children render eagerly**, as the JSX is built, so by the time `<Styles>`
runs its children have already registered everything. That is why it reads and
then clears, rather than resetting first, and why it can be a component at all
rather than a wrapper function.

**A component returning a thunk emits raw HTML.** The runtime escapes a string
returned from a component but calls a function and takes its result as-is,
which is how `<Styles>` injects markup without a raw-HTML escape hatch.

Classes are named by hashing the CSS, so identical rules from different
components collapse into one, and a component's class is stable across renders
and processes.

## Limits

No vendor prefixing, no theming, no client-side runtime. A `<style>` element is
invalid inside `<tbody>` or `<select>`, so fragments swapped into those need
their rules already on the page.
