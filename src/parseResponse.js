// import { Readable } from "node:stream";

import { createCookies, createId } from "./helpers/index.js";
import { json } from "./reply.js";
import ServerError from "./ServerError.js";

export default async function parseResponse(out, ctx) {
  // undefined || null || 0 || false || ~""~ -> empty string is still 200
  if (!out && typeof out !== "string") return null;

  if (typeof out === "function") {
    out = await out(ctx);
  }

  // A plain number is a status code
  if (typeof out === "number") {
    out = new Response(undefined, { status: out });
  }

  // A plain string will be converted to either html or plain
  if (typeof out === "string") {
    const type = /^\s*\</.test(out) ? "text/html" : "text/plain";
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

  // If we have CORS, set it up
  if (ctx.options.cors) {
    const { origin, methods } = ctx.options.cors;
    out.headers.set("Access-Control-Allow-Origin", origin);
    out.headers.set("Access-Control-Allow-Methods", methods);
  }

  // If we have a session, we need to persist it into a cookie
  if (Object.keys(ctx.session || {}).length) {
    if (!ctx.options.session?.store) {
      throw ServerError.NO_STORE({});
    }

    // Persistence is based on the Token
    // Persistence is based on the Cookies
    // No session cookies, generate a _persistent_ cookie
    if (!ctx.cookies.session) {
      ctx.res.cookies.session = createId();
    }
    const id = ctx.cookies.session;

    // Saves the session in the session store
    // Note that this is async but we are totally fine deferring it
    ctx.options.session.store.set(id, ctx.session);
  }

  // Cookies to headers
  if (ctx.options.cookies) {
    if (Object.keys(ctx.res.cookies).length) {
      createCookies(ctx.res.cookies).forEach((cookie) => {
        ctx.res.headers.append("set-cookie", cookie);
      });
    }
  }

  // Add the headers that are neeeded
  if (ctx?.res?.headers) {
    for (let key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }

  return out;
}
