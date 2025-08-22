import server from "../../src/index.js";

const BASE_URL = "https://jsonplaceholder.typicode.com";
const TOKEN = process.env.TOKEN;

// Make a simple data streaming app
export default server().get("/*", (ctx) => {
  const url = new URL(ctx.url.pathname, BASE_URL);
  return fetch(url, { headers: { "X-KEY": TOKEN } });
});
