import z from "zod";

import server, { cookies, file, json, status, view } from "../../src/index.js";
import authRouter from "./authRouter.js";
import db from "./db.js";

const options = {
  port: 3000,
  views: "views",
  public: "docs",
};

const PetSchema = z.object({
  name: z.string(),
  age: z.number(),
});

export default server(options)
  .router("/auth", authRouter)

  .get("/", () => view("home.html"))

  .get(
    "/pets",
    { query: z.object({ name: z.string() }) },
    async function getAllPets(ctx) {
      console.log(ctx.url.query);
      return json(await db.pets.list());
    }
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
    console.log(ctx.body);
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

  .get("/socket", () => view("socket.html"))

  .socket("message", async (ctx) => {
    // send back a message
    ctx.socket.send(`You said: ${ctx.body}`);
    await new Promise((done) =>
      setTimeout(done, 1000 + 3 * Math.random() * 1000)
    );
    ctx.socket.send(`They said: ${Math.random()}`);
  })

  .get("/*", () => 404);
