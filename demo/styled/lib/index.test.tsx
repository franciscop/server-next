import styled, { global, keyframes, Styles } from "./index";

// Unit tests for the library itself. The demo's own tests cover the app; these
// cover the pieces, including the ones an app is unlikely to hit by accident.
const render = (el: JSX.Element): string =>
  (<Styles>{el}</Styles> as unknown as () => string)();

const cssOf = (html: string) =>
  html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";

describe("classes", () => {
  it("names a class after its CSS, so identical rules collapse", () => {
    const A = styled.div`color: red;`;
    const B = styled.span`color: red;`;
    const html = render(
      <div>
        <A /> <B />
      </div>,
    );
    // Same declaration, same hash, one rule for two components
    expect(cssOf(html).match(/color: red/g)).toHaveLength(1);
  });

  it("keeps a class stable across renders", () => {
    const A = styled.div`color: blue;`;
    const first = render(<A />);
    const second = render(<A />);
    expect(first).toBe(second);
  });

  it("merges a class given by the caller", () => {
    const A = styled.div`color: red;`;
    const html = render(<A class="mine" />);
    expect(html).toMatch(/class="s\w+ mine"/);
  });

  it("accepts className too, for React-shaped callers", () => {
    const A = styled.div`color: red;`;
    expect(render(<A className="mine" />)).toContain("mine");
  });
});

describe("props", () => {
  it("reads $props from the CSS and keeps them out of the HTML", () => {
    const A = styled.div`color: ${(p) => p.$tone};`;
    const html = render(<A $tone="rebeccapurple" />);
    expect(cssOf(html)).toContain("rebeccapurple");
    expect(html).not.toContain("$tone");
    expect(html).not.toContain('rebeccapurple"');
  });

  it("gives a different class per distinct value", () => {
    const A = styled.div`color: ${(p) => p.$tone};`;
    const html = render(
      <div>
        <A $tone="red" />
        <A $tone="blue" />
      </div>,
    );
    expect(cssOf(html).match(/\.s\w+\{/g)).toHaveLength(2);
  });

  it("passes ordinary attributes through", () => {
    const A = styled.a`color: red;`;
    expect(render(<A href="/x" id="y" />)).toContain('href="/x"');
  });
});

describe("composition", () => {
  it("resolves a component to its selector inside another template", () => {
    const Menu = styled.nav`max-height: 0;`;
    const Toggle = styled.input`&:checked ~ ${Menu} { max-height: 10rem; }`;
    const css = cssOf(render(<div><Toggle /><Menu /></div>));
    expect(css).toContain(`&:checked ~ ${String(Menu)}`);
    expect(String(Menu)).toMatch(/^\.s\w+$/);
  });

  it("folds an extension into one class, base first", () => {
    const Button = styled.button`color: red;`;
    const Loud = styled(Button)`color: blue;`;
    const css = cssOf(render(<Loud />));
    const rule = css.split("}").find((r) => r.includes("blue")) ?? "";
    // Both declarations, base before the override, in a single rule
    expect(rule).toContain("red");
    expect(rule.indexOf("red")).toBeLessThan(rule.indexOf("blue"));
    expect(css.match(/\.s\w+\{/g)).toHaveLength(1);
  });

  it("keeps the base's element when extending", () => {
    const Button = styled.button`color: red;`;
    const Loud = styled(Button)`color: blue;`;
    expect(render(<Loud />)).toContain("<button");
  });

  it("styles a foreign component by handing it a class", () => {
    const Box = ({ class: cls, children }: any) => <section class={cls}>{children}</section>;
    const Styled = styled(Box)`padding: 8px;`;
    const html = render(<Styled>hi</Styled>);
    expect(html).toMatch(/<section class="s\w+">hi<\/section>/);
  });
});

describe("as", () => {
  it("renders a different element with the same class", () => {
    const Title = styled.h1`color: red;`;
    const cls = String(Title).slice(1);
    expect(render(<Title as="h2">hi</Title>)).toBe(
      `<style>.${cls}{color: red;}</style><h2 class="${cls}">hi</h2>`,
    );
  });

  it("does not leak `as` into the HTML", () => {
    const Title = styled.h1`color: red;`;
    expect(render(<Title as="h2" id="x" />)).not.toContain('as=');
  });

  it("carries through an extension, which otherwise keeps the base element", () => {
    const Title = styled.h1`color: red;`;
    const Loud = styled(Title)`color: blue;`;
    expect(render(<Loud />)).toContain("<h1");
    expect(render(<Loud as="h3" />)).toContain("<h3");
  });

  it("accepts a component, which places the class itself", () => {
    const Box = ({ class: cls, children }: any) => <section class={cls}>{children}</section>;
    const Title = styled.h1`color: red;`;
    expect(render(<Title as={Box}>hi</Title>)).toMatch(
      /<section class="s\w+">hi<\/section>/,
    );
  });
});

describe("output", () => {
  it("puts globals before the scoped rules", () => {
    global`body { margin: 0; }`;
    const A = styled.div`color: red;`;
    const css = cssOf(render(<html><head></head><body><A /></body></html>));
    expect(css.indexOf("margin: 0")).toBeLessThan(css.indexOf("color: red"));
  });

  it("names an animation after its body, and ships it with the globals", () => {
    const spin = keyframes`from { rotate: 0deg; } to { rotate: 360deg; }`;
    const A = styled.div`animation: ${spin} 1s;`;
    const css = cssOf(render(<html><head></head><body><A /></body></html>));
    expect(spin).toMatch(/^k\w+$/);
    expect(css).toContain(`@keyframes ${spin}`);
    expect(css).toContain(`animation: ${spin} 1s`);
  });

  it("cannot be closed early by CSS containing </style>", () => {
    const A = styled.div`content: "</style><script>alert(1)</script>";`;
    const html = render(<A />);
    expect(html).not.toContain("</style><script>");
    expect(html).toContain("<\\/style>");
  });

  it("emits nothing when there is nothing to emit", () => {
    expect(render(<div>plain</div>)).toBe("<div>plain</div>");
  });
});
