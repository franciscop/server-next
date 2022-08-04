import fs from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Bucket from "../src/bucket.js";

import server, { get, post } from "../src/index.js";
import apiMiddleware from "./middleware/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const delay = (time) => new Promise((done) => setTimeout(done, time));

const pets = [
  {
    id: 0,
    name: "Tobi",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    id: 1,
    name: "John",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    id: 2,
    name: "Mike",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
  },
  {
    id: 3,
    name: "Darry",
    description:
      "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?",
  },
];

const app = server({
  port: 3000,
  public: "demo/public",
  bucket: Bucket("demo/public"),
});

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

  get("/bad", async () => {
    throw new Error("The file you are trying to edit does not exist anymore");
  }),

  get("/pets", async function getAllPets() {
    // @title Find all the pets
    // @description Get a list of all pets available in the store right now.
    // const pets = await pets.findAll();
    // return pets;
    return json(pets);
  }),

  get("/pets/:id", async (ctx) => {
    // @title Find a specific pet
    // @description Get all of the information relevant to the given pet ID.
    // const one = await pets.findOne({ where: { id }});
    const id = +ctx.url.params.id;
    const pet = pets.find((p) => p.id === id);
    if (!pet) return 404;
    return json(pet);
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

  // {
  //   handle: (error) => {
  //     console.clear();
  //     console.log("ERROR!", error);
  //     return 500;
  //   },
  // },
]);
