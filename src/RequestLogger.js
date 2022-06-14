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

const findSize = ({ headers, body, size }, res) => {
  if (size) return size;
  if (body) return body.length;
  if (headers["content-length"]) return +headers["content-length"];
  return 0;
};

function simpleType(type) {
  const simpler = {
    "text/html": "html",
    "text/plain": "text",
    "image/svg+xml": "svg",
    "image/png": "png",
    "text/css": "css",
    "application/javascript": "js",
    "application/json": "json",
    "text/markdown": "md",
  };
  return simpler[type] || type;
}

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
    if (!isProduction) {
      const status = ctx.res.status;

      const paddedPath = `${ctx.url?.path || ctx.url} {dim}`.padEnd(30, "╌");
      const statColor =
        status < 300 ? "green" : status < 500 ? "yellow" : "red";
      const statusBlock = `{${statColor}}[${ctx.res.status}]{/}`;
      const resSize = format(findSize(ctx.res), ["b", "kb"], 100000);
      const t = Math.round(ctx.time._total - ctx.time._init);
      const resTime = format(t, ["ms", "s"], 1000);

      const type = simpleType(
        ctx.res.type || ctx.res.headers["content-type"] || "----"
      );
      const method = ("[" + ctx.method + "]").padEnd(6, " ");
      const reqText = `{dim}${method}{/} ${paddedPath}`;
      const resText = `${statusBlock} ${resSize} ${resTime} ${type}`;
      const text = color(`${reqText}╌›{/} ${resText}`);

      spinnies.succeed(`spinner-${this.id}`, { text });
    }
  };
}
