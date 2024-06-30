# Testin the app

> Early idea

Create a .test() method that returns an axios-like interface for easy testing:

```js
// index.js
// Your normal server app
export default server()
  .get("/", () => "Hello world")
  .post("/", (ctx) => ctx.body);

// index.test.js
// Your testing scripts
import app from "./index.js";
const api = app.test();

test("home", async () => {
  const { data, headers } = await api.get("/");
  expect(data).toBe("Hello world");
  expect(headers["content-type"]).toBe("plain/text");
});

test("submit", async () => {
  const { data, headers } = await api.post("/", { hello: "world" });
  expect(data).toEqual({ hello: "world" });
  expect(headers["content-type"]).toBe("application/json");
});
```
