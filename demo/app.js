import fs from "fs/promises";

import server, { cookies, file, json, status } from "../src/index.js";
import authRouter from "./authRouter.js";
import pets from "./pets.js";

const options = {
  port: 3000,
  views: "demo/views",
  public: "docs",
};

export default server(options)
  .router("/auth", authRouter)

  .get("/", function getHome() {
    return fs.readFile("./demo/views/home.html", "utf-8");
  })

  .get("/home", function getHome() {
    return fs.readFile("./demo/views/home.html", "utf-8");
  })

  .get("/pets", async function getAllPets() {
    return json(pets);
  })

  .get("/pets/:id", async (ctx) => {
    const id = Number(ctx.url.params.id);
    const pet = pets.find((p) => p.id === id);
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

  .post("/pets", (ctx) => {
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

  .post("/json", (ctx) => {
    return json(ctx.body);
  })

  .post("/multipart", (ctx) => {
    return json(ctx.body);
  })

  .get("/hello", async () => {
    return "Welcome page";
  })

  .get("/socket", () => file("./demo/views/socket.html"))

  .socket("message", async (ctx) => {
    console.log(ctx.socket);
    // send back a message
    ctx.socket.send(`You said: ${ctx.body}`);
    await new Promise((done) =>
      setTimeout(done, 1000 + 3 * Math.random() * 1000)
    );
    ctx.socket.send(`They said: ${Math.random()}`);
  })

  .get("/*", () => 404);
