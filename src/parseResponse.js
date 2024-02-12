// import { Readable } from "node:stream";

import { json } from "./reply.js";

export default async function parseResponse(handler, ctx) {
  let out = await handler(ctx);

  // undefined || null || 0 || false || ~""~ -> empty string is still 200
  if (!out && typeof out !== "string") return null;

  if (typeof out === "function") {
    out = out(ctx);
  }

  // A plain number is a status code
  if (typeof out === "number") {
    out = new Response(undefined, { status: out });
  }

  // A plain string will be converted to either html or plain
  if (typeof out === "string") {
    const type = /\s*\</.test(out) ? "text/html" : "text/plain";
    out = new Response(out, { headers: { "content-type": type } });
  }

  // https://stackoverflow.com/a/69745650/938236
  if (out?.constructor === Object || Array.isArray(out)) {
    out = json(out);
  }

  // if (out instanceof Readable) {
  // if (out?.prototype?.name === 'Readable') {
  //   out = new Response(Readable.toWeb(out));
  // }

  if (!(out instanceof Response)) {
    throw new Error(`Invalid response type ${out}`);
  }

  // Here it should be a Response
  if (ctx?.res?.headers) {
    for (let key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }

  return out;
}
