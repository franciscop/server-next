import server, { type } from "../..";

import ejs from "ejs";
import Handlebars from "handlebars";
import pug from "pug";
import { readFile } from "node:fs/promises";

// Pug — compileFile caches the compiled template
const home = pug.compileFile("./views/home.pug");

// Handlebars — compile once from disk
const hello = Handlebars.compile(await readFile("./views/hello.hbs", "utf8"));
const fragment = Handlebars.compile(
  await readFile("./views/fragment.hbs", "utf8"),
);

export default server()
  // Pug
  .get("/", () => home({ name: "World" }))

  // Handlebars
  .get("/hello", () => hello({ name: "World" }))

  // EJS — renderFile returns a promise, so just return it
  .get("/users/:id", (ctx) =>
    ejs.renderFile("./views/user.ejs", { id: ctx.url.params.id }),
  )

  // The rendered output doesn't start with "<", so set the type explicitly
  .get("/fragment", () => type("html").send(fragment({ name: "World" })));
