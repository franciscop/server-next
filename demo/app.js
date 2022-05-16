import server, { get } from "../src/index.js";
import fs from "node:fs/promises";
import mime from "mime";
import files from "files";
import prettier from "prettier";

const pkg = await files.read("package.json").then((data) => JSON.parse(data));

const delay = (time) => new Promise((done) => setTimeout(done, time));

const app = server({ port: 3000 });

const getTitle = (fn, method, path) => {
  const raw = fn
    .toString()
    .split("\n")
    .find((l) => /^\s*\/\/\s*@title\s*/.test(l));
  if (!raw) return `<h3>${method} ${path}</h3>`;
  return `<h3><code>${method.toUpperCase()} ${path}</code> ${raw.replace(
    /^\s*\/\/\s*@title\s*/,
    ""
  )}</h3>`;
};

const getDescription = (fn, method, path) => {
  const raw = fn
    .toString()
    .split("\n")
    .find((l) => /^\s*\/\/\s*@description\s*/.test(l));
  if (!raw) return ``;
  return `<p>${raw.replace(/^\s*\/\/\s*@description\s*/, "")}</p>`;
};

const getReturn = (fn) => {
  let carry = false;
  const code = fn
    .toString()
    .split("\n")
    .filter((line) => {
      if (/^\s*return/.test(line) && /;\s*$/.test(line)) return true;
      if (/^\s*return/.test(line)) {
        carry = true;
        return true;
      }
      if (carry) {
        if (/;\s*$/.test(line)) {
          carry = false;
        }
        return true;
      }
    })
    .map((l) => l.trim())
    .join("\n");
  return prettier.format(code, { parser: "babel" });
};

app([
  get("/_api", (ctx) => {
    const data = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          html {
            background: #eee;
            font-family: Helvetica;
          }
          body {
            width: 800px;
            margin: 50px auto;
            background: #fff;
            padding: 30px;
            min-height: 100vh;
            box-shadow: 0 0 10px -5px #aaa;
          }
          h1 {
            margin: 0;
          }
          h2 {
            margin-top: 30px;
          }
          h3 {
            margin-top: 30px;
          }
          code {
            background: #eee;
            padding: 5px 10px;
          }
          pre {
            position: relative;
            background: #eee;
            padding: 10px;
          }
          button {
            position: absolute;
            top: 2px;
            right: 2px;
          }
        </style>
      </head>
      <body>
        <h1>API Documentation for <code>${pkg.name}@${pkg.version}</code></h1>
        <p>${pkg.description}</p>
        ${
          pkg.homepage
            ? `<h2>Base domain</h2><pre>${pkg.homepage}</pre>`
            : `<p>Add a "homepage" key to your package.json to see this properly built.</p>`
        }
        <h2>Methods</h2>
        ${Object.entries(ctx.api)
          .map(([method, value]) =>
            value
              .filter((path) => !/^\/_/.test(path))
              .filter((path) => path[0].startsWith("/pets"))
              .map(
                (path) =>
                  `
                  ${getTitle(path[1], method, path[0])}
                  ${getDescription(path[1])}
                  <p>Request:</p>
                  <pre>${method.toUpperCase()} ${pkg.homepage.slice(0, -1)}${
                    path[0]
                  }</pre>
                  <p>Response:</p>
                  <pre>${getReturn(
                    path[1]
                  )}<button>See full handler</button></pre>
                  `
              )
              .join("")
          )
          .join("")}
      </body>
    </html>
    `;
    return {
      type: "text/html",
      data,
      status: 200,
    };
  }),

  get("*", async (ctx) => {
    if (!ctx.pathname || !ctx.pathname.includes(".")) return;
    const path = "./docs" + ctx.pathname;
    if (await files.exists(path)) {
      const type = mime.getType(path); // => 'text/plain'
      const data = await fs.readFile(path, "utf-8");
      return { type, data, status: 200 };
    }
  }),

  get("/", async () => {
    await delay(Math.random() * 1000 + 1000);
    const data = await fs.readFile("./docs/index.html", "utf-8");
    return data;
  }),

  get("/pets", async () => {
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

  get("/hello", async () => {
    await delay(Math.random() * 1000 + 1000);
    return "Welcome page";
  }),

  get("*", async () => {
    await delay(Math.random() * 1000 + 1000);
    return 404;
  }),
]);
