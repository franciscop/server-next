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

  it("can render a pre with text", () => {
    expect(<pre>hello</pre>).toRender("<pre>hello</pre>");
  });

  it("can render a pre with newlines", () => {
    expect(<pre>line1{"\n"}line2</pre>).toRender("<pre>line1\nline2</pre>");
  });

  it("can render a pre with indented text", () => {
    expect(<pre>{`  indented`}</pre>).toRender("<pre>  indented</pre>");
  });

  it("can render a pre inside a div", () => {
    expect(
      <div>
        <pre>line1{"\n"}line2</pre>
      </div>,
    ).toRender("<div><pre>line1\nline2</pre></div>");
  });

  it("does NOT render the <pre>", () => {
    expect(<code>{"<pre>"}</code>).toRender("<code>&lt;pre&gt;</code>");
  });
});

describe("text encoding", () => {
  it("encodes < and > to prevent XSS", () => {
    expect(<div>{"<script>alert(1)</script>"}</div>).toRender(
      "<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>",
    );
  });

  it("encodes & in text content", () => {
    expect(<div>{"a & b"}</div>).toRender("<div>a &amp; b</div>");
  });

  it('encodes " in text content', () => {
    expect(<div>{'say "hi"'}</div>).toRender("<div>say &quot;hi&quot;</div>");
  });

  it("encodes ' in text content", () => {
    expect(<div>{"it's"}</div>).toRender("<div>it&#39;s</div>");
  });

  it("renders 0 as a child", () => {
    expect(<div>{0}</div>).toRender("<div>0</div>");
  });

  it("renders positive integers", () => {
    expect(<div>{42}</div>).toRender("<div>42</div>");
  });

  it("renders floats", () => {
    expect(<div>{3.14}</div>).toRender("<div>3.14</div>");
  });

  it("renders negative numbers", () => {
    expect(<div>{-1}</div>).toRender("<div>-1</div>");
  });

  it("renders nothing for null", () => {
    expect(<div>{null}</div>).toRender("<div></div>");
  });

  it("renders nothing for undefined", () => {
    expect(<div>{undefined}</div>).toRender("<div></div>");
  });

  it("renders nothing for false", () => {
    expect(<div>{false}</div>).toRender("<div></div>");
  });

  it("renders nothing for true", () => {
    expect(<div>{true}</div>).toRender("<div></div>");
  });

  it("renders conditional content", () => {
    const show = true;
    expect(<div>{show && <span>yes</span>}</div>).toRender(
      "<div><span>yes</span></div>",
    );
    const hide = false;
    expect(<div>{hide && <span>no</span>}</div>).toRender("<div></div>");
  });

  it("renders multiple children in order", () => {
    expect(
      <ul>
        <li>a</li>
        <li>b</li>
        <li>c</li>
      </ul>,
    ).toRender("<ul><li>a</li><li>b</li><li>c</li></ul>");
  });

  it("renders array children", () => {
    const items = ["x", "y", "z"];
    expect(
      <span>
        {items.map((i) => (
          <b key={i}>{i}</b>
        ))}
      </span>,
    ).toRender("<span><b>x</b><b>y</b><b>z</b></span>");
  });

  it("treats string returned from a function child as raw HTML", () => {
    const getHtml = () => "<b>bold</b>";
    expect(<div>{getHtml}</div>).toRender("<div><b>bold</b></div>");
  });
});

describe("attribute encoding", () => {
  it("encodes < and > in attribute values", () => {
    expect(<div title="<b>hi</b>"></div>).toRender(
      '<div title="&lt;b&gt;hi&lt;/b&gt;"></div>',
    );
  });

  it("encodes & in attribute values", () => {
    expect(<div title="a & b"></div>).toRender('<div title="a &amp; b"></div>');
  });

  it('encodes " in attribute values', () => {
    expect(<div title={`say "hi"`}></div>).toRender(
      '<div title="say &quot;hi&quot;"></div>',
    );
  });

  it("encodes ' in attribute values", () => {
    expect(<div title={"it's"}></div>).toRender('<div title="it&#39;s"></div>');
  });

  it("maps className to class", () => {
    expect(<div className="foo bar"></div>).toRender(
      '<div class="foo bar"></div>',
    );
  });

  it("maps htmlFor to for", () => {
    expect(<label htmlFor="email"></label>).toRender(
      '<label for="email"></label>',
    );
  });

  it("supports data-* attributes", () => {
    expect(<div data-id="42" data-name="test"></div>).toRender(
      '<div data-id="42" data-name="test"></div>',
    );
  });

  it("supports aria-* attributes", () => {
    expect(<button aria-label="close" aria-expanded={false}></button>).toRender(
      '<button aria-label="close"></button>',
    );
  });

  it("supports numeric attribute values", () => {
    expect(<input tabIndex={3} />).toRender('<input tabIndex="3" />');
  });

  it("strips function-valued attributes", () => {
    expect(<div onFoo={() => {}} ref={() => {}}></div>).toRender("<div></div>");
  });
});

describe("self-closing tags", () => {
  it("renders br", () => {
    expect(<br />).toRender("<br />");
  });

  it("renders hr", () => {
    expect(<hr />).toRender("<hr />");
  });

  it("renders img with attributes", () => {
    expect(<img src="cat.png" alt="A cat" />).toRender(
      '<img src="cat.png" alt="A cat" />',
    );
  });

  it("renders input with type and name", () => {
    expect(<input type="text" name="q" />).toRender(
      '<input type="text" name="q" />',
    );
  });

  it("renders link tag", () => {
    expect(<link rel="stylesheet" href="style.css" />).toRender(
      '<link rel="stylesheet" href="style.css" />',
    );
  });

  it("renders meta tag", () => {
    expect(<meta name="description" content="hello" />).toRender(
      '<meta name="description" content="hello" />',
    );
  });

  it("renders source tag", () => {
    expect(<source src="video.mp4" type="video/mp4" />).toRender(
      '<source src="video.mp4" type="video/mp4" />',
    );
  });
});

describe("fragments", () => {
  it("does not crash on symbol-based element types (React internals)", () => {
    expect(
      <>
        <span>Hello</span> world
      </>,
    ).toRender("<span>Hello</span> world");
  });

  it("renders nested fragments", () => {
    expect(
      <>
        <>
          <span>A</span>
        </>
        B
      </>,
    ).toRender("<span>A</span>B");
  });

  it("handles empty fragments", () => {
    expect(<></>).toRender("");
  });

  it("encodes text inside a fragment", () => {
    expect(<>{"<b>"}</>).toRender("&lt;b&gt;");
  });
});

describe("script tag", () => {
  it("renders script content without encoding", () => {
    expect(<script>{"const x = 1 < 2 && 3 > 0;"}</script>).toRender(
      "<script>const x = 1 < 2 && 3 > 0;</script>",
    );
  });

  it("renders script with src attribute and no children", () => {
    expect(<script src="app.js"></script>).toRender(
      '<script src="app.js"></script>',
    );
  });

  it("renders empty script tag", () => {
    expect(<script></script>).toRender("<script></script>");
  });
});

describe("style tag", () => {
  it("renders style content", () => {
    expect(<style>{"body { color: red; }"}</style>).toRender(
      "<style>body{color:red}</style>",
    );
  });

  it("minifies whitespace in style content", () => {
    expect(
      <style>{"body {\n  color:   red;\n  margin: 0;\n}"}</style>,
    ).toRender("<style>body{color:red;margin:0}</style>");
  });

  it("strips CSS comments", () => {
    expect(
      <style>{"/* reset */ body { margin: 0; } /* end */"}</style>,
    ).toRender("<style>body{margin:0}</style>");
  });

  it("preserves child combinator in selectors", () => {
    expect(<style>{":not(pre) > code { background: none; }"}</style>).toRender(
      "<style>:not(pre)>code{background:none}</style>",
    );
  });

  it("preserves sibling combinators in selectors", () => {
    expect(
      <style>{"h2 + p { margin: 0; } h2 ~ p { color: red; }"}</style>,
    ).toRender("<style>h2+p{margin:0}h2~p{color:red}</style>");
  });

  it("removes spaces around braces, colons, and semicolons", () => {
    expect(<style>{"a { color : red ; font-size : 1em ; }"}</style>).toRender(
      "<style>a{color:red;font-size:1em}</style>",
    );
  });

  it("removes trailing semicolon before closing brace", () => {
    expect(<style>{"p { margin: 0; padding: 0; }"}</style>).toRender(
      "<style>p{margin:0;padding:0}</style>",
    );
  });

  it("does not break </style> injection", () => {
    expect(<style>{"a { content: '</style>'; }"}</style>).toRender(
      "<style>a{content:'<\\/style>'}</style>",
    );
  });
});

describe("dangerouslySetInnerHTML", () => {
  it("renders raw HTML without encoding", () => {
    expect(
      <div dangerouslySetInnerHTML={{ __html: "<b>bold</b>" }}></div>,
    ).toRender("<div><b>bold</b></div>");
  });

  it("does not double-encode HTML entities", () => {
    expect(
      <div dangerouslySetInnerHTML={{ __html: "&amp; &lt;" }}></div>,
    ).toRender("<div>&amp; &lt;</div>");
  });

  it("preserves script tags in raw HTML", () => {
    expect(
      <div
        dangerouslySetInnerHTML={{ __html: "<script>alert(1)</script>" }}
      ></div>,
    ).toRender("<div><script>alert(1)</script></div>");
  });

  it("does not render dangerouslySetInnerHTML as an attribute", () => {
    expect(<div dangerouslySetInnerHTML={{ __html: "hi" }}></div>).toRender(
      "<div>hi</div>",
    );
  });
});

describe("function components", () => {
  it("renders a simple function component", () => {
    const Greeting = ({ name }) => <p>Hello, {name}!</p>;
    expect(<Greeting name="world" />).toRender("<p>Hello, world!</p>");
  });

  it("renders a component with children", () => {
    const Box = ({ children }) => <div className="box">{children}</div>;
    expect(
      <Box>
        <span>inside</span>
      </Box>,
    ).toRender('<div class="box"><span>inside</span></div>');
  });

  it("renders nested components", () => {
    const Inner = () => <em>inner</em>;
    const Outer = () => (
      <div>
        <Inner />
      </div>
    );
    expect(<Outer />).toRender("<div><em>inner</em></div>");
  });

  it("renders a component returning null", () => {
    const Empty = () => null;
    expect(<Empty />).toRender("");
  });

  it("renders a component returning a string", () => {
    const Text = () => "hello";
    expect(<Text />).toRender("hello");
  });

  it("encodes text returned by a component", () => {
    const Unsafe = () => "<script>alert(1)</script>";
    expect(<Unsafe />).toRender("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("forwardRef-like components", () => {
  it("renders an object with a render function", () => {
    const Button = { render: ({ children }) => <button>{children}</button> };
    expect(<Button>click me</Button>).toRender("<button>click me</button>");
  });

  it("passes props to render function", () => {
    const Input = {
      render: ({ type, placeholder }) => (
        <input type={type} placeholder={placeholder} />
      ),
    };
    expect(<Input type="email" placeholder="you@example.com" />).toRender(
      '<input type="email" placeholder="you@example.com" />',
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
    const Link = () =>
      reactEl("a", { href: "https://example.com", children: "click" });
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
describe("styles", () => {
  it("stringifies style object into CSS", () => {
    expect(
      <div
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "4px",
        }}
      />,
    ).toRender(
      '<div style="display:inline-block;padding:2px 8px;border-radius:4px"></div>',
    );
  });

  it("handles numbers and mixed style values", () => {
    expect(
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          fontWeight: "600",
        }}
      />,
    ).toRender(
      '<div style="font-size:12;line-height:1.5;font-weight:600"></div>',
    );
  });

  it("converts camelCase CSS properties", () => {
    expect(
      <div
        style={{
          backgroundColor: "#fff",
          marginTop: "10px",
        }}
      />,
    ).toRender('<div style="background-color:#fff;margin-top:10px"></div>');
  });

  it("ignores null and undefined style values", () => {
    expect(
      <div
        style={{
          color: "red",
          padding: null,
          margin: undefined,
        }}
      />,
    ).toRender('<div style="color:red"></div>');
  });
});

describe("svg attributes", () => {
  it("converts strokeWidth to stroke-width", () => {
    expect(
      <svg>
        <circle strokeWidth="2" />
      </svg>,
    ).toRender('<svg><circle stroke-width="2"></circle></svg>');
  });

  it("converts fillOpacity to fill-opacity", () => {
    expect(
      <svg>
        <rect fillOpacity="0.5" />
      </svg>,
    ).toRender('<svg><rect fill-opacity="0.5"></rect></svg>');
  });

  it("converts strokeLinecap to stroke-linecap", () => {
    expect(
      <svg>
        <line strokeLinecap="round" />
      </svg>,
    ).toRender('<svg><line stroke-linecap="round"></line></svg>');
  });

  it("does NOT break viewBox casing", () => {
    expect(
      <svg viewBox="0 0 100 100">
        <rect />
      </svg>,
    ).toRender('<svg viewBox="0 0 100 100"><rect></rect></svg>');
  });

  it("handles mixed SVG attributes correctly", () => {
    expect(
      <svg viewBox="0 0 10 10">
        <circle strokeWidth="1" fillOpacity="0.2" />
      </svg>,
    ).toRender(
      '<svg viewBox="0 0 10 10"><circle stroke-width="1" fill-opacity="0.2"></circle></svg>',
    );
  });

  it("keeps viewBox unchanged", () => {
    expect(
      <svg viewBox="0 0 100 100">
        <rect />
      </svg>,
    ).toRender('<svg viewBox="0 0 100 100"><rect></rect></svg>');
  });

  it("does NOT convert viewBox to view-box", () => {
    expect(<svg viewBox="0 0 10 10"></svg>).toRender(
      '<svg viewBox="0 0 10 10"></svg>',
    );
  });

  it("converts strokeWidth to stroke-width", () => {
    expect(
      <svg>
        <circle strokeWidth="2" />
      </svg>,
    ).toRender('<svg><circle stroke-width="2"></circle></svg>');
  });

  it("converts fillOpacity to fill-opacity", () => {
    expect(
      <svg>
        <rect fillOpacity="0.5" />
      </svg>,
    ).toRender('<svg><rect fill-opacity="0.5"></rect></svg>');
  });

  it("converts strokeLinecap to stroke-linecap", () => {
    expect(
      <svg>
        <line strokeLinecap="round" />
      </svg>,
    ).toRender('<svg><line stroke-linecap="round"></line></svg>');
  });

  it("handles mixed SVG attributes correctly", () => {
    expect(
      <svg viewBox="0 0 10 10">
        <circle strokeWidth="1" fillOpacity="0.2" />
      </svg>,
    ).toRender(
      '<svg viewBox="0 0 10 10"><circle stroke-width="1" fill-opacity="0.2"></circle></svg>',
    );
  });
});
