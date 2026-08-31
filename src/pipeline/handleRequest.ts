import type { Context, Server } from "..";
import ServerError from "../errors";
import parseResponse, { finalize } from "./parseResponse";
import pathPattern from "./pathPattern";
import { resolveBody } from "../body/body";
import { checkTraversal } from "../http/security";
import define from "../util/define";
import { validateRequest, validateResponse } from "./validate";
import isValidMethod from "../context/isValidMethod";

export default async function handleRequest(
  app: Server,
  ctx: Context,
): Promise<Response | undefined> {
  let res = await getResponse(app, ctx);
  // One exit for every response, routes and onError output alike: CORS,
  // security headers, cache/ETag, credential clearing and Server-Timing.
  if (res) res = await finalize(res, ctx);
  // The one "after the response" position (linear middleware has none): a hook
  // over every finalized HTTP response — routes, static, 404s, onError output.
  // Return a Response to replace it (sent verbatim), or nothing to leave it as is.
  if (res && ctx.options.onResponse) {
    const replaced = await ctx.options.onResponse(res, ctx);
    if (replaced) res = replaced; // a returned Response replaces; nothing keeps it
  }
  // Log the request once the final response is known (no-op unless `log` is on)
  if (res) ctx.options.log.request(ctx, res);
  // HEAD keeps the headers (type, cache, ETag...) and drops the body
  if (res?.body && ctx.method === "head") {
    res.body.cancel().catch(() => {});
    res = new Response(null, { status: res.status, headers: res.headers });
  }
  return res;
}

async function getResponse(
  app: Server,
  ctx: Context,
): Promise<Response | undefined> {
  try {
    // Checked here, not in the context builders, so the 405 goes through
    // onError and finalize (CORS headers included) like any other error
    if (!isValidMethod(ctx.method)) {
      throw ServerError.METHOD_NOT_ALLOWED({ method: ctx.method });
    }

    let matched = false;

    // HEAD is GET without the body (RFC 9110 requires supporting both): an
    // explicit .head() route wins, then GET routes answer with the body
    // stripped at the end of handleRequest
    const routes =
      ctx.method === "head"
        ? [...app.handlers.head, ...app.handlers.get]
        : app.handlers[ctx.method];

    // 1. Find the matching route. Its `fns` already include the middleware that
    //    were registered before it, so we just run the list in order.
    for (const route of routes) {
      const params = pathPattern(route.path, ctx.url.pathname || "/");
      if (!params) continue;
      matched = true;
      define(ctx.url, "params", () => params);

      // The per-route settings, merged over the global ones (local wins).
      // Only real settings: the route's schemas stay on route.options, so
      // ctx.options carries what its Settings type says and nothing else.
      const { parser, cache, uploads } = route.options;
      if (parser !== undefined || cache !== undefined || uploads !== undefined) {
        ctx.options = { ...app.settings };
        if (parser !== undefined) ctx.options.parser = parser;
        if (cache !== undefined) ctx.options.cache = cache;
        if (uploads !== undefined) ctx.options.uploads = uploads;
      }

      // Reject '../' in params before any handler (or body) touches them
      checkTraversal(params, ctx);

      // Now that the route (and its `parser` mode) is known, read the body
      // once. A `stream` route gets the unread stream; the middleware in `fns`
      // (auth, etc.) still run first, since they sit before the handler.
      ctx.body = await resolveBody(
        ctx,
        ctx.options.parser,
        ctx.options.security.maxBodySize,
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
        ctx.options.security.maxBodySize,
      );
      for (const mw of app.middleware) {
        const out = await parseResponse(await mw(ctx), ctx);
        if (out) return out;
      }
    }

    // In Netlify, a non-response passes through to the original resource
    if (ctx.platform.provider === "netlify") return;

    // In other environments, a non-response is wrong and we should 404 then
    throw ServerError.NOT_FOUND();
  } catch (error: any) {
    // The error response goes through the same finalize() as everything else
    return ctx.options.onError(error, ctx);
  }
}
