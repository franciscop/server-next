import kv from "polystore";
import z from "zod";

import server, { cookies, file, json, status } from "../../../src/index.js";
import db from "./db.js";

const store = kv(`file://${process.cwd()}/src/data/store.json`);
const sessionStore = kv(`file://${process.cwd()}/src/data/session.json`);
const authStore = kv(`file://${process.cwd()}/src/data/auth.json`);

const options = {
  port: 3000,
  public: "public",
  store,
  session: { store: sessionStore },
  openapi: true,
  auth: {
    type: "token",
    provider: "email",
    store: authStore,
  },
};

const PetSchema = z.object({
  name: z.string(),
  age: z.number(),
});

export default server(options)
  .get("/login", { tags: "Auth", title: "Get login page" }, () =>
    file("src/views/login.html"),
  )
  .get("/register", { tags: "Auth", title: "Get register page" }, () =>
    file("src/views/register.html"),
  )

  .get("/", { tags: "Testing" }, () => file("src/views/home.html"))

  .get("/socket", { tags: "Testing" }, () => file("src/views/socket.html"))

  .get(
    "/pets",
    { tags: "Pets " },
    // { query: z.object({ name: z.string() }) },
    async function getAllPets(ctx) {
      const data = await db.pets.list();
      ctx.time("db-list");
      return json(data);
    },
  )
  .get("/pets/:id", { tags: "Pets " }, async (ctx) => {
    const id = Number(ctx.url.params.id);
    const pet = await db.pets.get(id);
    if (!pet) return status(404).json({ error: "Not found" });
    return json(pet);
  })
  .patch("/pets/:id", { tags: "Pets " }, async (ctx) => {
    // DO SOMETHING
    return 200;
  })
  .put("/pets/:id", { tags: "Pets " }, async (ctx) => {
    // DO SOMETHING
    return 200;
  })
  .post("/pets", { body: PetSchema, tags: "Pets" }, (ctx) => {
    return status(201).json(ctx.body);
  })

  .get("/query", { tags: "Testing" }, (ctx) => {
    return json(ctx.url.query);
  })

  .get("/cookie", { tags: "Testing" }, async () => {
    return cookies({
      mycookie: "myvalue",
      another: { value: "myvalue2", path: "/hello" },
    }).send("Hello world");
  })

  .get("/session", { tags: "Testing" }, async (ctx) => {
    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Session page</title>
      </head>
      <body>
        <input type="number" value="${ctx.session.counter || 0}">
        <button>Save</button>
        <script>
          document.querySelector('button').onclick = e => {
            const value = document.querySelector('input').value;
            fetch('/session', { method: 'POST', body: value, headers: { 'content-type': 'application/json' } })
          };
        </script>
      </body>
    </html>`;
  })

  .post("/session", { tags: "Testing" }, async (ctx) => {
    ctx.session.counter = Number(ctx.body);
    return { counter: ctx.session.counter };
  })

  .get("/json", { tags: "Testing" }, () => {
    return json({ hello: "world" });
  })

  .get("/file", { tags: "Testing" }, () => {
    return file("public/logo.png");
  })

  .post("/json", { tags: "Testing" }, (ctx) => {
    return json(ctx.body);
  })

  .post("/multipart", { tags: "Testing" }, (ctx) => {
    return json(ctx.body);
  })

  .get("/hello", { tags: "Testing" }, async () => {
    return "Welcome page";
  })

  .socket("message", async (ctx) => {
    // send back a message
    ctx.socket.send(`You said: ${ctx.body}`);
    await new Promise((done) =>
      setTimeout(done, 1000 + 3 * Math.random() * 1000),
    );
    ctx.socket.send(`They said: ${Math.random()}`);
  })

  .get("/*", { tags: "Errors" }, () => 404);
