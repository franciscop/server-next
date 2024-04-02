import parseResponse from "../parseResponse.js";
import pathPattern from "../pathPattern.js";
import define from "./define.js";
import validate from "./validate.js";

export default async function handleRequest(handlers, ctx) {
  for (let [method, matcher, ...cbs] of handlers[ctx.method]) {
    const match = pathPattern(matcher, ctx.url.pathname || "/");
    // Skip this whole middleware if there was no match
    if (!match) continue;

    define(ctx.url, "params", () => match);

    for (let cb of cbs) {
      try {
        validate(ctx, cb);
        if (typeof cb === "function") {
          const out = await parseResponse(cb, ctx);
          if (out) return out;
        }
      } catch (error) {
        return new Response(error.message, { status: error.status || 500 });
      }
    }

    // When it's an HTTP method, break free after it's done (which will 404)
    if (method !== "*") break;
  }

  return new Response("Not Found", { status: 404 });
}
