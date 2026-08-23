import { jsx } from "@server/next/jsx-runtime";
import styledBase, { type ServerStyleSheet } from "styled-components";

type Props = Record<string, unknown> & {
  children?: unknown;
  className?: string;
};

type Value = string | number | ((props: Props) => string | number);

/** Tags a template into a component, as `styled.a` does for `<a>`. */
type Tagged = (
  strings: TemplateStringsArray,
  ...values: Value[]
) => (props: Props) => JSX.Element;

type Sheet = ServerStyleSheet["instance"];

// Stands in for stylis: styled-components hands it the CSS and the selector to
// join, and this renderer wants neither minifying nor vendor prefixing.
type Stringifier = ((css: string, selector: string) => string[]) & {
  hash: number;
};

// What a styled-components component carries. These are internals rather than
// public API, which is the price of driving its sheet by hand.
type Internal = {
  componentStyle: {
    generateAndInjectStyles(
      props: Props,
      sheet: Sheet,
      stringifier: Stringifier,
    ): string;
  };
  foldedComponentIds: string;
  styledComponentId: string;
  target: string;
};

let sheet: Sheet | null = null;

const stringifier = ((css: string, selector: string) => [
  `${selector}{${css.trim()}}`,
]) as Stringifier;
stringifier.hash = 0;

const wrap =
  (Component: Internal) =>
  ({ children, ...props }: Props): JSX.Element => {
    const dynamic = sheet
      ? Component.componentStyle.generateAndInjectStyles(
          props,
          sheet,
          stringifier,
        )
      : "";
    const cls = [
      Component.foldedComponentIds,
      Component.styledComponentId,
      dynamic,
      props.className,
    ]
      .filter(Boolean)
      .join(" ");
    // `$` props are for the CSS, so they stop here
    const forwarded = Object.fromEntries(
      Object.entries(props).filter(([key]) => !key.startsWith("$")),
    );
    // Called rather than written as JSX, since the tag name is only known here
    return jsx(Component.target, { className: cls, ...forwarded, children });
  };

// styled-components types its tags as 150-odd named properties rather than an
// index signature, so the dynamic lookup is cast once here and typed after.
const tags = styledBase as unknown as Record<
  string,
  (strings: TemplateStringsArray, ...values: Value[]) => Internal
>;

export const styled = new Proxy({} as Record<string, Tagged>, {
  get(_target, key: string) {
    return (strings: TemplateStringsArray, ...values: Value[]) =>
      wrap(tags[key](strings, ...values));
  },
});

export const getStyles = (server: ServerStyleSheet) => {
  sheet = server.instance;
  return ({ children }: Props): JSX.Element => {
    const html =
      typeof children === "function" ? children() : String(children);
    const styleTags = server.getStyleTags();
    server.seal();
    sheet = null;
    // A fragment (an htmx swap) has no <head>, so the styles go in front of it
    // rather than being dropped. A thunk, since the runtime escapes a string
    // returned from a component.
    const head = html.indexOf("</head>");
    if (head === -1) return () => styleTags + html;
    return () => html.slice(0, head) + styleTags + html.slice(head);
  };
};
