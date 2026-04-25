/** @jsxImportSource . */

expect.extend({
  toRender(fn, rendered) {
    const html = fn();
    if (this.isNot) {
      const msg = `Expected "${html}"  to render differently`;
      return { pass: html === rendered, message: () => msg };
    }
    const msg = `Expected "${html}" to be rendered as "${rendered}"`;
    return { pass: html === rendered, message: () => msg };
  },
});

describe("jsx", () => {
  it("can render a div", () => {
    expect(<div>Hello</div>).toRender("<div>Hello</div>");
  });

  it("can render an input with attributes", () => {
    expect(<input name="hello" />).toRender(`<input name="hello" />`);
  });

  it("will stringify an attribute", () => {
    expect(<input value={5.2} />).toRender('<input value="5.2" />');
  });

  it("will ignore a boolean attribute", () => {
    expect(<input disabled />).toRender("<input disabled />");
    expect(<input disabled={true} />).toRender("<input disabled />");
    expect(<input disabled={false} />).toRender("<input />");
  });

  it("will remove events", () => {
    expect(<input onChange={() => console.log("hello")} />).toRender(
      "<input />",
    );
  });

  it("will inject the doctype for html", () => {
    // biome-ignore lint/a11y/useHtmlLang: This is an example, not user code
    expect(<html>Hello</html>).toRender("<!DOCTYPE html><html>Hello</html>");
    expect(<html lang="en">Hello</html>).toRender(
      `<!DOCTYPE html><html lang="en">Hello</html>`,
    );
  });
});

describe("React element interop", () => {
  // Simulate a component built with React's jsx runtime, which returns plain
  // objects { type, props } instead of @server/next functions
  const reactEl = (type, props = {}) => ({ type, props });

  it("renders a React element returned from a function component", () => {
    const Greeting = () => reactEl("h1", { children: "Hello" });
    expect(<Greeting />).toRender("<h1>Hello</h1>");
  });

  it("renders nested React elements", () => {
    const Card = () =>
      reactEl("div", {
        children: [
          reactEl("h2", { children: "Title" }),
          reactEl("p", { children: "Body" }),
        ],
      });
    expect(<Card />).toRender("<div><h2>Title</h2><p>Body</p></div>");
  });

  it("renders React elements as children of a native element", () => {
    const child = reactEl("strong", { children: "bold" });
    expect(<p>{child}</p>).toRender("<p><strong>bold</strong></p>");
  });

  it("renders a mix of React elements and plain strings as children", () => {
    const em = reactEl("em", { children: "world" });
    expect(<p>Hello {em}!</p>).toRender("<p>Hello <em>world</em>!</p>");
  });

  it("renders a React element with attributes", () => {
    const Link = () => reactEl("a", { href: "https://example.com", children: "click" });
    expect(<Link />).toRender(`<a href="https://example.com">click</a>`);
  });

  it("renders deeply nested React elements", () => {
    const Deep = () =>
      reactEl("div", {
        children: reactEl("ul", {
          children: [
            reactEl("li", { children: "one" }),
            reactEl("li", { children: "two" }),
          ],
        }),
      });
    expect(<Deep />).toRender("<div><ul><li>one</li><li>two</li></ul></div>");
  });
});
