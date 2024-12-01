import { jsx } from "./jsx.js";

const $ = (code) => code();

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
