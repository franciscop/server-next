import server from "../..";

const BASE_URL = "https://jsonplaceholder.typicode.com";
export default server().get("/*", (ctx) => {
  const url = new URL(ctx.url.pathname, BASE_URL);
  return fetch(url);
});
