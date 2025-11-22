import type { Context } from "..";
import parseResponse from "../parseResponse";
import pathPattern from "../pathPattern";
import define from "./define";
import validate from "./validate";

export default async function handleRequest(
  handlers: Record<string, any[]>,
  ctx: Context,
): Promise<Response | undefined> {
  try {
    for (const [method, matcher, ...cbs] of handlers[ctx.method]) {
      const match = pathPattern(matcher, ctx.url.pathname || "/");

      // Skip this whole middleware if there was no match
      if (!match) continue;

      define(ctx.url, "params", () => match);

      for (const cb of cbs) {
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
  } catch (error: any) {
    return new Response(error.message || "", { status: error.status || 500 });
  }
}
