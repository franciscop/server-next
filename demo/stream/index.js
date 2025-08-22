import server from "../../src/index.js";
const URL = "https://jsonplaceholder.typicode.com";

const home = `<div>
  Fetch proxy: <a href="/todos/1">/todos/1</a>
  <br />
  Generator: <a href="/generator">/generator</a>
  <br />
  Async Generator: <a href="/async">/async</a>
</div>`;

// Make a simple data streaming app
export default server()
  .get("/favicon.ico", () => 404)
  .get("/", () => home)
  .get("/generator", function* () {
    const texts = ["Hello ", "World ", "Plain ", "Generator"];
    for (const text of texts) {
      yield text;
    }
  })
  .get("/async", async function* generateStream() {
    for (let i = 1; i <= 5; i++) {
      console.log(`Part ${i}`);
      yield `Chunk ${i}: Hello from Bun!\n`;
      await new Promise((done) => setTimeout(done, 1000)); // Simulate async work
    }
  })
  .get("/*", (ctx) => fetch(`${URL}${ctx.url.pathname}`));
