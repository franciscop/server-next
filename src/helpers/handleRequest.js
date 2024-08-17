import middle from "../middle/index.js";
import parseResponse from "../parseResponse.js";
import pathPattern from "../pathPattern.js";
import define from "./define.js";
import validate from "./validate.js";

const extendWithDefaults = (ctx) => {
  // TODO: find a better way of doing this FFS
  // Only want to execute it once; it needs to happen on a per-request
  // basis since we only have full access to the options there
  if (ctx.app.extended) return;
  middle(ctx);
  ctx.app.extended = true;
};

export default async function handleRequest(handlers, ctx) {
  extendWithDefaults(ctx);

  for (let [method, matcher, ...cbs] of handlers[ctx.method]) {
    const match = pathPattern(matcher, ctx.url.pathname || "/");
    // Skip this whole middleware if there was no match
    if (!match) continue;

    define(ctx.url, "params", () => match);

    for (let cb of cbs) {
      if (typeof cb === "function") {
        const res = await cb(ctx);
        const out = await parseResponse(res, ctx);
        if (out) return out;
      } else {
        validate(ctx, cb);
      }
    }

    // When it's an HTTP method, break free after it's done (which will 404)
    if (method !== "*") break;
  }

  // In Netlify, a non-response is perfectly valid, which would indicate
  // the edge function to just go ahead and consume the original resource
  if (ctx.platform.provider === "netlify") return;

  // In other environments, a non-response is wrong and we should 404 then
  return new Response("Not Found", { status: 404 });
}
