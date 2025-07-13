import server, { status, type } from "../../src/index.js";
const URL = "https://jsonplaceholder.typicode.com";

// // Make a simple data streaming app
// export default server().get("/", async () => {
//   const res = await fetch(URL);
//   if (!res.ok) return status(res.statusCode);
//   console.log(res.body);
//   // Stream the FULL body, with headers etc
//   return res;
// });

// Make a simple data streaming app
export default server().get("/*", async (ctx) => {
  const res = await fetch(`${URL}${ctx.url.pathname}`);
  if (!res.ok) return status(res.statusCode);
  return res;
  // return type("json").send(res.body);
});
