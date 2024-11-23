import fsp from "node:fs/promises";
import prettier from "prettier";

const pkg = await fsp
  .readFile("package.json", "utf-8")
  .then((data) => JSON.parse(data));

const getTitle = (fn, method, path) => {
  const title =
    fn
      .toString()
      .split("\n")
      .find((l) => /^\s*\/\/\s*@title\s*/.test(l)) || "";
  const fnName = fn.name ? fn.name + "() " : "";
  const name = title ? title.replace(/^\s*\/\/\s*@title\s*/, "") : fnName;
  return `<h3><code>${method.toUpperCase()} ${path}</code> ${name}</h3>`;
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

export default (ctx) => `
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
            .filter((path) => !/^\/_/.test(path[0]))
            .filter((path) => path[0] !== "*")
            // .filter((path) => path[0].startsWith("/pets"))
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
