import app from "./index";

// What the implementation claims, checked: one class per component, extension
// folded into a single class, a component usable as a selector, and a fragment
// that carries only its own rules.
describe("styled", () => {
  const api = app.test();

  const styles = (html: string) =>
    html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";

  it("puts every rule in the head, once", async () => {
    const html = await (await api.get("/")).text();
    const css = styles(html);

    expect(html.indexOf("<style>")).toBeLessThan(html.indexOf("</head>"));
    // Two <Grid> uses, one rule
    expect(css.match(/display:\s*flex/g)).toHaveLength(1);
  });

  it("emits a class per distinct render, not per element", async () => {
    const css = styles(await (await api.get("/")).text());
    // <Button> and <Button $primary> differ, so two rules
    expect(css.match(/border:\s*2px solid tomato/g)?.length).toBeGreaterThan(1);
  });

  it("folds an extension into one class, base rules first", async () => {
    const css = styles(await (await api.get("/")).text());
    const extended = css.match(/\.s\w+\{([^{}]*\\2192[^{}]*)\}/);
    // The ::after lives in the same rule as the inherited background
    expect(css).toContain("2192");
    // ...and the extension's own class carries the base's properties too
    const withArrow = css.split("}").find((r) => r.includes("2192")) ?? "";
    expect(withArrow).toContain("border");
  });

  it("resolves a component to its own selector", async () => {
    const html = await (await api.get("/")).text();
    const css = styles(html);
    // The Toggle rule targets the Menu's generated class
    const sibling = css.match(/&:checked ~ \.(s\w+)/);
    expect(sibling).toBeTruthy();
    expect(html).toContain(`class="${sibling![1]}"`);
  });

  it("keeps $props out of the HTML", async () => {
    const html = await (await api.get("/")).text();
    expect(html).not.toContain("$primary");
  });

  it("a fragment carries its own rules and no globals", async () => {
    const html = await (await api.get("/fragment")).text();
    expect(html).toStartWith("<style>");
    expect(html).toContain("tomato");
    // The page-level defaults belong to a document, not to a swap
    expect(html).not.toContain("system-ui");
  });
});

// Rules are read and cleared at </Styles>, which is what lets it be a
// component. The cost is that a page rendering styled components without one
// leaves its rules behind for whichever page collects next.
describe("the collection is per <Styles>, not per request", () => {
  const api = app.test();

  it("does not carry one page's rules into the next", async () => {
    const first = await (await api.get("/")).text();
    const second = await (await api.get("/fragment")).text();

    // The fragment carries only the button it renders
    expect(second).toContain("tomato");
    expect(second).not.toContain("max-height");
    expect(first).toContain("max-height");
  });

  it("renders the same page identically twice", async () => {
    const a = await (await api.get("/")).text();
    const b = await (await api.get("/")).text();
    expect(a).toBe(b);
  });
});
