import color from "./color.js";

const isDebug = process.argv.includes("--debug");

export default function debugInfo<T extends Record<string, any>>(
  options: T,
  name: keyof T,
  cb: (value: T[keyof T]) => string,
  icon: string = "",
): void {
  if (!isDebug) return;

  if (!options[name]) {
    console.log(color`options:${String(name)}\t→ {dim}[not set]{/}`);
    return;
  }

  console.log(
    color`options:${String(name)}\t→ ${icon ? `${icon} ` : ""}${cb(options[name])}`,
  );
}
