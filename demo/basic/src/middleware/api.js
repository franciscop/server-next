import fsp from "node:fs/promises";
import prettier from "prettier";

const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const encode = (str = "") => {
  if (typeof str === "number") str = String(str);
  if (typeof str !== "string") return ""; // nullify not-strings
  return str.replace(/[&<>"]/g, (tag) => entities[tag]);
};

const multiTrim = (str) => {
  const len = str.split("\n")[0].match(/^\s+/);
  if (!len) return str;
  return str
    .split("\n")
    .map((l) => l.slice(len[0].length))
    .join("\n");
};

const pkg = await fsp
  .readFile("package.json", "utf-8")
  .then((data) => JSON.parse(data));

const getTag = (name, fn) => {
  const found = fn
    .toString()
    .split("\n")
    .filter((l) => /\s+\/\/\s/.test(l))
    .map((l) => l.trim().replace("// ", ""))
    .find((l) => l.startsWith(name));
  if (!found) return "";
  return encode(found.replace(name, "").trim());
};

const getTitle = (method, path) => {
  return `<h3><code>${method.toUpperCase()} ${path}</code></h3>`;
};

const getDescription = (fn) => {
  const description = getTag("@description", fn);
  if (!description) return "";
  return `<p>${description}</p>`;
};

const getReturn = (fn) => {
  try {
    const tag = getTag("@returns", fn);
    if (tag) return tag;
    let carry = false;
    let template = false;

    const errors = [];
    const addError = (line) => {
      errors.push("throw " + line.split("throw ")[1]);
    };

    const lines = fn.toString().split("\n");
    const code = lines
      .filter((line) => {
        if (lines.length === 1) return true;
        if (template) return true;
        if (/\`/.test(line)) template = !template;
        if (/throw /.test(line)) addError(line);
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
      .map((l) =>
        l
          .replace("() => ", "")
          .replace(/return /, "")
          .replace(/\;/, ""),
      )
      .join("\n");
    if (errors.length) {
      return (
        encode(multiTrim(code)) +
        "</pre><p>Response errors:</p><pre>" +
        encode(errors.join("\n"))
      );
    }
    return encode(multiTrim(code));
  } catch (error) {
    return "ERROR";
  }
};

const getHandler = async (fn) => {
  try {
    return await prettier.format(fn.toString(), { parser: "babel" });
  } catch (error) {
    return "ERROR";
  }
};
const allAndJoin = (parts) => Promise.all(parts).then((res) => res.join(""));

export default async ({ app }) => {
  // @description A HTML page with the API definitions
  // @returns <!DOCTYPE html><html><body>...</body></html>
  const getCode = async (path) => `
${getTitle(...path)}
${getDescription(path[2])}
<p>Request:</p>
<pre>${path[0].toUpperCase()} ${pkg.homepage.slice(0, -1)}${path[0] === "socket" ? "/" : path[1]}</pre>
<p>Response:</p>
<pre>${getReturn(path[2])}</pre>
${
  path[3]
    ? `<p>META:</p>
<pre>${encode(JSON.stringify(path[3], null, 2))}</pre>`
    : ""
}
`;

  const getEntry = (value) =>
    allAndJoin(
      value
        .filter((path) => !/^\/_/.test(path[0]))
        .filter((path) => path[0] !== "*")
        .map((path) => [
          path[0],
          path[1],
          path.find((p) => typeof p === "function"),
          path.find((p) => typeof p === "object"),
        ])
        .map((path) => getCode(path)),
    );

  return `
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
          overflow-x: auto;
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
      <h2>Endpoints</h2>
      ${await allAndJoin(Object.values(app.handlers).map(getEntry))}
    </body>
  </html>`;
};
