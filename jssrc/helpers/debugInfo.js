import color from "./color.js";

const isDebug = process.argv.includes("--debug");

export default function debugInfo(options, name, cb, icon = "") {
  if (!isDebug) return;
  if (!options[name]) {
    return console.log(color`options:${name}\t→ {dim}[not set]{/}`);
  }
  console.log(
    color`options:${name}\t→ ${icon ? icon + " " : ""}${cb(options[name])}`,
  );
}
