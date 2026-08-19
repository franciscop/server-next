export {};

const { default: app } = await import("./index");
const api = app.test();

describe("third-party JSX library", () => {
  it("renders llmrender's markdown through Server's JSX", async () => {
    const html = await (await api.get("/")).text();
    expect(html).toContain("<h1 id=");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<table>");
  });

  it("nests their components inside ours", async () => {
    const html = await (await api.get("/")).text();
    // our shell...
    expect(html).toContain("<!DOCTYPE html>");
    // ...wrapping their output
    expect(html.indexOf("<body>")).toBeLessThan(html.indexOf("<h1 id="));
  });

  it("renders to a plain string with no server involved", async () => {
    const html = await (await api.get("/fragment")).text();
    expect(html).toBe(
      '<div><h3 id="just-the-html"><a href="#just-the-html">Just the HTML</a></h3></div>',
    );
  });

  it("serves the library's own theme", async () => {
    const res = await api.get("/theme.css");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });
});
