import path from "node:path";
import Spinnies from "spinnies";
import color from "./color.js";

const isProduction = process.env.NODE_ENV === "production";

const format = (n, [below, above], limit = Infinity) => {
  if (n < 1000) {
    return n.toFixed(0).padStart(4, " ") + ` {dim}${below.padEnd(2, " ")}{/}`;
  }
  const clean = (n / 1000).toFixed(n > 90000 ? 0 : 1).padStart(4, " ");
  if (n > 10 * limit) {
    return `{red}${clean} ${above.padEnd(2, " ")}{/}`;
  } else if (n > limit) {
    return `{yellow}${clean} ${above.padEnd(2, " ")}{/}`;
  } else {
    return `${clean} {dim}${above.padEnd(2, " ")}{/}`;
  }
};

const range = (char, num) => {
  const cols = process.stdout.columns || 80;
  let str = "";
  for (let i = 0; i < cols; i += char.length) {
    str += char;
  }
  return str;
};

function simpleType(type) {
  const simpler = {
    "text/html": "html",
    "text/plain": "text",
    "image/svg+xml": "svg",
    "image/png": "png",
    "text/css": "css",
    "text/javascript": "js",
    "application/javascript": "js",
    "application/json": "json",
    "text/markdown": "md",
  };
  return simpler[type] || type;
}

const cwd = path.resolve("./");

let spinnies;
export default function RequestLogger(ctx) {
  this.id = Math.round(Math.random() * 100000);

  if (!isProduction) {
    if (!spinnies) {
      spinnies = new Spinnies({ succeedColor: "white", failColor: "white" });
    }
    const method = ("[" + ctx.method.toLowerCase() + "]").padEnd(6, " ");
    const text = color(`{dim}${method}{/} ${ctx.url?.path || ctx.url}`);
    spinnies.add(`spinner-${this.id}`, { text });
  }

  this.end = function (ctx) {
    if (isProduction) return;
    const status = ctx.res.status;

    const paddedPath = `${ctx.url?.path || ctx.url} {dim}`.padEnd(30, "─");
    const statColor = status < 300 ? "green" : status < 500 ? "yellow" : "red";
    const statusBlock = `{${statColor}}[${ctx.res.status}]{/}`;
    const resSize = format(ctx.res.size || 0, ["b", "kb"], 100000);
    const t = Math.round(ctx.time._total - ctx.time._init);
    const resTime = format(t, ["ms", "s"], 1000);

    const type = simpleType(
      ctx.res.type || ctx.res.headers["content-type"] || "----"
    );
    const method = ("[" + ctx.method + "]").padEnd(6, " ");
    const reqText = `{dim}${method}{/} ${paddedPath}`;
    const resText = `${statusBlock} ${resSize} ${resTime} ${type}`;
    const text = color(`${reqText}─›{/} ${resText}`);

    this.text = text;
    if (statColor !== "red") {
      spinnies.succeed(`spinner-${this.id}`, { text });
    } else {
      spinnies.fail(`spinner-${this.id}`, { text });
    }
  };

  this.error = function (err) {
    const cols = process.stdout.columns || 80;
    console.log(color("{red}  ┌───────┬" + range("─").slice(12) + "┐{/}"));
    console.log(
      color(
        `{red}  │ {bright}{red}Error{/} {red}│{/} ${err.message.padEnd(
          cols - 14,
          " "
        )} {red}│{/}`
      )
    );
    console.log(color("{red}  ├───────┼" + range("─").slice(12) + "┤{/}"));
    console.log(
      color(
        err.stack
          .split("\n")
          .slice(1)
          .map((line, i) => {
            line = line.replace(/\s*at\s/, "");
            line = line.replace("file://" + cwd, "{dim}$PWD{/}");
            return (
              `{red}  │{/} ${i === 0 ? "Trace" : "     "} {red}│{/} ` +
              line.padEnd(cols - 6, " ") +
              " {red}│{/}"
            );
          })
          .join("\n")
      )
    );
    console.log(color("{red}  └───────┴" + range("─").slice(12) + "┘{/}"));
  };

  this.reprint = function () {
    if (isProduction) return;
    console.log(color(`{red}✖{/} `) + this.text);
  };
}
