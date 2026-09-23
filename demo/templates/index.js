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

// A rendered template is a string, and a string is text until it says it's
// markup, so every engine's output goes through type("html")
export default server()
  // Pug
  .get("/", () => type("html").send(home({ name: "World" })))

  // Handlebars
  .get("/hello", () => type("html").send(hello({ name: "World" })))

  // EJS: renderFile returns a promise, which send() awaits
  .get("/users/:id", (ctx) =>
    type("html").send(
      ejs.renderFile("./views/user.ejs", { id: ctx.url.params.id }),
    ),
  )

  // A partial, for HTMX or any other fragment swap
  .get("/fragment", () => type("html").send(fragment({ name: "World" })));
