import kv from "polystore";
import z from "zod";

import server, { cookies, file, json, status } from "../../../src/index.js";
import authRouter from "./authRouter.js";
import db from "./db.js";
import api from "./middleware/api.js";

const store = kv(`file://${process.cwd()}/src/data/store.json`);
const sessionStore = kv(`file://${process.cwd()}/src/data/session.json`);
const authStore = kv(`file://${process.cwd()}/src/data/auth.json`);

const options = {
  port: 3000,
  public: "public",
  store,
  session: { store: sessionStore },
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
  .get("/docs/", api)
  .router("/auth", authRouter)

  .get("/", () => file("src/views/home.html"))
  .get("/login", () => file("src/views/login.html"))
  .get("/register", () => file("src/views/register.html"))
  .get("/socket", () => file("src/views/socket.html"))

  .get(
    "/pets",
    // { query: z.object({ name: z.string() }) },
    async function getAllPets(ctx) {
      // @description Get a list of all the pets in the store
      // @returns Pet[]
      const data = await db.pets.list();
      ctx.time("db-list");
      console.log("DATA:", data);
      return json(data);
    },
  )
  .get("/pets/:id", async (ctx) => {
    const id = Number(ctx.url.params.id);
    const pet = await db.pets.get(id);
    if (!pet) return status(404).json({ error: "Not found" });
    return json(pet);
  })
  .patch("/pets/:id", async (ctx) => {
    // DO SOMETHING
    return 200;
  })
  .put("/pets/:id", async (ctx) => {
    // DO SOMETHING
    return 200;
  })
  .post("/pets", { body: PetSchema }, (ctx) => {
    // DO SOMETHING
    return status(201).json(ctx.body);
  })

  .get("/query", (ctx) => {
    return json(ctx.url.query);
  })

  .get("/cookie", async () => {
    return cookies({
      mycookie: "myvalue",
      another: { value: "myvalue2", path: "/hello" },
    }).send("Hello world");
  })

  .get("/session", async (ctx) => {
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

  .post("/session", async (ctx) => {
    ctx.session.counter = Number(ctx.body);
    return { counter: ctx.session.counter };
  })

  .get("/json", () => {
    return json({ hello: "world" });
  })

  .get("/file", () => {
    return file("public/logo.png");
  })

  .post("/json", (ctx) => {
    return json(ctx.body);
  })

  .post("/multipart", (ctx) => {
    return json(ctx.body);
  })

  .get("/hello", async () => {
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

  .get("/*", () => 404);
