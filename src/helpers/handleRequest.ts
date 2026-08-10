import { ServerError, type Context, type Server } from "..";
import parseResponse from "../parseResponse";
import pathPattern from "../pathPattern";
import { resolveBody } from "./body";
import { applyCors } from "./cors";
import { applySecurity, checkTraversal } from "./security";
import define from "./define";
import { validateRequest, validateResponse } from "./validate";

export default async function handleRequest(
  app: Server,
  ctx: Context,
): Promise<Response | undefined> {
  let res = await getResponse(app, ctx);
  // The one "after the response" position (linear middleware has none): a hook
  // over every finalized HTTP response — routes, static, 404s, onError output.
  // Return a Response to replace it (sent verbatim), or nothing to leave it as is.
  if (res && ctx.options.onResponse) {
    const replaced = await ctx.options.onResponse(res, ctx);
    if (replaced) res = replaced; // a returned Response replaces; nothing keeps it
  }
  // Log the request once the final response is known (no-op unless `log` is on)
  if (res) ctx.options.log.request(ctx, res);
  return res;
}

async function getResponse(
  app: Server,
  ctx: Context,
): Promise<Response | undefined> {
  try {
    let matched = false;

    // 1. Find the matching route. Its `fns` already include the middleware that
    //    were registered before it, so we just run the list in order.
    for (const route of app.handlers[ctx.method]) {
      const params = pathPattern(route.path, ctx.url.pathname || "/");
      if (!params) continue;
      matched = true;
      define(ctx.url, "params", () => params);

      // Per-route options, merged over the global settings (local wins)
      if (Object.keys(route.options).length) {
        ctx.options = { ...app.settings, ...route.options };
      }

      // Reject '../' in params before any handler (or body) touches them
      checkTraversal(params, ctx);

      // Now that the route (and its `parser` mode) is known, read the body
      // once. A `stream` route gets the unread stream; the middleware in `fns`
      // (auth, etc.) still run first, since they sit before the handler.
      ctx.body = await resolveBody(
        ctx,
        ctx.options.parser,
        ctx.options.security.maxBody,
      );

      // Run the route's schemas (body/query/params) before any of its fns, so
      // even the middleware only ever see validated, typed values.
      await validateRequest(ctx, route.options);

      for (const cb of route.fns) {
        const res = await cb(ctx);
        // A plain object/array return is the JSON payload the `response`
        // schema describes, so it's checked here before being serialized.
        const out = await parseResponse(
          await validateResponse(res, route.options),
          ctx,
        );
        if (out) return out;
      }

      // A method matched; do not fall through to other routes
      break;
    }

    // 2. No route matched: run the global middleware (this is how static files
    //    via `assets` answer requests that are not routes).
    if (!matched) {
      ctx.body = await resolveBody(
        ctx,
        ctx.options.parser,
        ctx.options.security.maxBody,
      );
      for (const mw of app.middleware) {
        const out = await parseResponse(await mw(ctx), ctx);
        if (out) return out;
      }
    }

    // In Netlify, a non-response passes through to the original resource
    if (ctx.platform.provider === "netlify") return;

    // In other environments, a non-response is wrong and we should 404 then
    throw new ServerError("NOT_FOUND", 404, "Not Found");
  } catch (error: any) {
    // Errors bypass parseResponse, so re-apply CORS here; otherwise a browser
    // can't even read the error status of a cross-origin request.
    const res = await ctx.options.onError(error, ctx);
    applyCors(res, ctx);
    applySecurity(res, ctx);
    return res;
  }
}
