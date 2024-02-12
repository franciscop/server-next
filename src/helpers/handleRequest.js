import parseResponse from "../parseResponse.js";
import pathPattern from "../pathPattern.js";
import define from "./define.js";

export default async function handleRequest(handlers, ctx) {
  for (let [matcher, ...cbs] of handlers[ctx.method]) {
    const match = pathPattern(matcher, ctx.url.pathname || "/");
    // Skip this whole middleware if there was no match
    if (!match) continue;

    define(ctx.url, "params", () => match);

    for (let cb of cbs) {
      const out = await parseResponse(cb, ctx);
      if (out) return out;
    }
  }

  return Response("Not Found", { status: 404 });
}
