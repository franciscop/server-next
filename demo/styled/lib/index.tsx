// Component-scoped CSS: a tagged template per element, collected while the page
// renders and injected into its <head>. There is no stylesheet; this is where
// every rule on the site lives.
//
//   const Menu = styled("nav")`width: 0;`;
//   const Toggle = styled("input")`&:checked ~ ${Menu} { width: 100%; }`;
//
// A component can also extend another, which emits one class holding both sets
// of rules, the base first so the extension can override it:
//
//   const Next = styled(Button)`&::after { content: " \\2192"; }`;
//
// The extension keeps the base's element, so extend a component built on the
// tag you want.
//
// Any other component can be styled too, as long as it puts the class it is
// given on an element:
//
//   const Summary = styled(Md)`p { margin: 0; }`;
//
// That one renders <Md class="..."> rather than inlining, since there is no way
// to know what element it will produce.
//
// Nesting, `&` and @media go in as written: browsers do native CSS nesting now,
// so the rule ships unchanged.
//
// `rules` is module state, which is safe only because rendering is
// synchronous: the JSX runtime has no await in it, so nothing can interleave
// between a page rendering and <Styles> reading its rules back. An async
// component would break that, and the framework rejects those anyway.
//
// Every page must end in a <Styles>, since that is what empties the set. One
// that renders styled components without it leaves them for whichever page
// collects next.
let rules = new Set<string>();
const globals: string[] = [];

const CLASS = Symbol("class");
// What an extension needs from the component it extends: which element to
// render, and the CSS to put in front of its own.
const TAG = Symbol("tag");
const BUILD = Symbol("build");

// The runtime hands back a thunk that produces HTML, but the framework's types
// declare JSX.Element as { type, props }. We follow the declared type and cast
// once, in `Styles`, which is the only place that calls the thunk.
type Thunk = () => string;

type Props = Record<string, any> & {
  children?: unknown;
  class?: string;
  className?: string;
  as?: string | ((props: Props) => JSX.Element | null);
};

/** A styled component, which also resolves to its own selector in a template. */
export type Styled = ((props: Props) => JSX.Element) & {
  [CLASS]?: string;
  [TAG]?: string;
  [BUILD]?: (props: Props) => string;
};

type Value = string | number | Styled | ((props: Props) => string | number);

const hash = (str: string) =>
  [...str]
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)
    .toString(36)
    .replace("-", "_");

// Rules that cannot belong to a class: @font-face, and the handful of element
// defaults the whole site sits on. Registered once at import, emitted on every
// page ahead of the scoped rules.
export const global = (strings: TemplateStringsArray, ...vals: Value[]) => {
  globals.push(String.raw(strings, ...vals.map(String)));
};

// An animation, named after its own contents so two identical ones collapse
// and two different ones never collide. Returns the name, to interpolate into
// an `animation` property.
//
// It joins the globals rather than the per-page rules: like them it is defined
// once at import, and unlike a component there is no render that would put it
// back after a page has been collected.
export const keyframes = (
  strings: TemplateStringsArray,
  ...vals: (string | number)[]
): string => {
  const body = String.raw(strings, ...vals);
  const name = "k" + hash(body);
  globals.push(`@keyframes ${name}{${body}}`);
  return name;
};

/** Tags a template into a styled component, as `styled.a` does for `<a>`. */
type Tagged = (strings: TemplateStringsArray, ...vals: Value[]) => Styled;

// A component interpolated into another's CSS resolves to its selector, which
// is what makes `input:checked ~ ${Menu}` expressible. Any other function is
// read from the props on each render, so that component's class is not fixed.
const interpolate =
  (strings: TemplateStringsArray, vals: Value[]) =>
  (props: Props): string =>
    String.raw(
      strings,
      ...vals.map((v) => {
        const cls = (v as Styled)?.[CLASS];
        if (cls) return `.${cls}`;
        return typeof v === "function"
          ? (v as (p: Props) => string | number)(props)
          : v;
      }),
    );

// Only a value read from the props makes a component dynamic: a component
// interpolated as a selector has a fixed class, so it does not. Extending a
// dynamic base makes the extension dynamic too.
const isDynamic = (vals: Value[], inherited?: Styled) =>
  vals.some((v) => typeof v === "function" && !(v as Styled)[CLASS]) ||
  Boolean(inherited && !inherited[CLASS]);

// A component whose CSS never varies gets its class once, at definition. That
// is also what lets it be interpolated into another template as a selector,
// since the class exists before any render.
const define = (component: Styled, build: (props: Props) => string) => {
  const cls = "s" + hash(build({}));
  component[CLASS] = cls;
  component.toString = () => `.${cls}`;
};

// The class for this render, registering its rule on the way out.
const register = (component: Styled, css: string): string => {
  const cls = component[CLASS] ?? "s" + hash(css);
  rules.add(`.${cls}{${css}}`);
  return cls;
};

// `$`-prefixed props feed the CSS and are not HTML attributes, so they stop
// here rather than ending up on the element. `children` stays, since a wrapped
// component needs it forwarded; where it is also passed as JSX children, those
// come last and win.
const attributes = (props: Props) => {
  const { class: _c, className: _n, ...rest } = props;
  for (const key of Object.keys(rest)) if (key[0] === "$") delete rest[key];
  return rest;
};

const classes = (...names: (string | undefined)[]) =>
  names.filter(Boolean).join(" ");

// One of ours: the CSS is inlined into a single class on a known element.
const create =
  (tag: string, inherited?: Styled): Tagged =>
  (strings, ...vals): Styled => {
    const own = interpolate(strings, vals);
    const before = inherited?.[BUILD];
    // The base's rules come first, so the extension can override them
    const build = before ? (props: Props) => before(props) + own(props) : own;

    const component: Styled = (props: Props) => {
      const cls = register(component, build(props));
      // `as` picks the element for this one render and keeps the styles. It is
      // ours, so it never reaches the HTML; a component works too, and places
      // the class itself the same way a wrapped one does.
      const { as, ...rest } = props;
      const Tag = (as ?? tag) as any;
      return (
        <Tag
          class={classes(cls, props.class, props.className)}
          {...attributes(rest)}
        >
          {props.children}
        </Tag>
      );
    };

    component[TAG] = tag;
    component[BUILD] = build;
    if (!isDynamic(vals, inherited)) define(component, build);
    return component;
  };

// Someone else's component: give it a class and let it place the class.
const wrap =
  (Base: (props: Props) => JSX.Element | null): Tagged =>
  (strings, ...vals): Styled => {
    const build = interpolate(strings, vals);

    const component = ((props: Props) => {
      const cls = register(component, build(props));
      return Base({
        ...attributes(props),
        class: classes(cls, props.class, props.className),
      });
    }) as Styled;

    if (!isDynamic(vals)) define(component, build);
    return component;
  };


// `styled.a` reads better than `styled("a")`, and a proxy gives every tag
// without listing them. Own properties (`name`, `call`, `bind`) still resolve to
// the function itself, so nothing shadows a real tag: none of them is one.
// Each tag is built once and cached, since the factory is the same every time.
const tags = new Map<string, Tagged>();

const styled = new Proxy(create, {
  // `styled(Button)` extends a component; `styled("a")` still names a tag.
  apply(target, thisArg, args: [string | Styled]) {
    const [what] = args;
    // One of ours is inlined into a single class; anything else is wrapped.
    if (typeof what === "function") {
      return what[TAG] ? create(what[TAG], what) : wrap(what as any);
    }
    return Reflect.apply(target, thisArg, args);
  },

  get(target, key, receiver) {
    if (typeof key !== "string" || key in target) {
      return Reflect.get(target, key, receiver);
    }
    let tagged = tags.get(key);
    if (!tagged) tags.set(key, (tagged = create(key)));
    return tagged;
  },
}) as ((tag: string) => Tagged) &
  ((base: Styled) => Tagged) &
  ((base: (props: any) => JSX.Element | null) => Tagged) & {
    [K in keyof HTMLElementTagNameMap]: Tagged;
  };

export default styled;

// Injecting past the renderer skips its own <style> guard, so redo it here: a
// `</style>` inside the CSS would close the element early and let whatever
// follows run as HTML.
const escapeCss = (str: string) => str.replace(/<\/style>/gi, "<\\/style>");// The rules are read and cleared here, at the end of the page, rather than
// reset at the start. That is what lets this be a component: the runtime
// renders an element's children as the JSX is built, so by the time <Styles>
// is called its children have already registered everything they need.
//
// Slice instead of replace: no substitution surprises from the replacement
// string, and the guard is free. A fragment has no <head> (an htmx swap is
// one), so it only carries the rules its own components need, in front of it.
//
// Returning a thunk rather than a string is what keeps the HTML raw: the
// runtime escapes a string returned from a component, but calls a function and
// takes its result as-is.
export const Styles = ({ children }: Props) => {
  const html = renderChildren(children);
  const head = html.indexOf("</head>");

  const css = escapeCss(
    (head === -1 ? "" : globals.join("")) + [...rules].join(""),
  );
  // Whatever this page used is spent; the next one starts empty
  rules = new Set();

  if (!css) return () => html;
  const style = `<style>${css}</style>`;
  return () =>
    head === -1 ? style + html : html.slice(0, head) + style + html.slice(head);
};

const renderChildren = (children: unknown): string => {
  if (Array.isArray(children)) return children.map(renderChildren).join("");
  if (typeof children === "function") return String((children as Thunk)());
  return children == null ? "" : String(children);
};
