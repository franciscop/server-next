import server, { get, post } from "../src/index.js";
import fs from "node:fs";
import apiMiddleware from "./middleware/api.js";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const delay = (time) => new Promise((done) => setTimeout(done, time));

const app = server({ port: 3000, public: "demo/public" });

const json = (body, status = 200) => ({
  status,
  body: JSON.stringify(body),
  headers: { "content-type": "application/json" },
});

app([
  get("/_api", apiMiddleware),

  get("/", async function getHome(ctx) {
    // ctx.time.start = performance.now();
    // await delay(Math.random() * 1000 + 1000);
    // ctx.time.delay = performance.now();
    return fs.createReadStream(__dirname + "/public/index.html");
    // const data = await fs.readFile(__dirname + "/public/index.html", "utf-8");
    // return data;
  }),

  get("/pets", async function getAllPets() {
    // @title Find all the pets
    // @description Get a list of all pets available in the store right now.
    const pets = await pets.findAll();
    return pets;
  }),

  get("/pets/:id", async () => {
    // @title Find a specific pet
    // @description Get all of the information relevant to the given pet ID.
    const pets = await pets.findOne();
    return pets;
  }),

  post("/query", (ctx) => {
    return json(ctx.url.query);
  }),

  post("/json", (ctx) => {
    return json(ctx.body);
  }),

  post("/multipart", (ctx) => {
    return json(ctx.body);
  }),

  get("/hello", async () => {
    await delay(Math.random() * 1000 + 1000);
    return "Welcome page";
  }),

  get("*", async () => {
    await delay(Math.random() * 1000 + 1000);
    return 404;
  }),
]);
