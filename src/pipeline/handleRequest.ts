import type { Context, Route, Server, Settings } from "..";
import { resolveUser } from "../auth";
import { resolveBody } from "../body/body";
import bodyKind from "../body/bodyKind";
import createContext, { type ContextParts } from "../context/createContext";
import isValidMethod from "../context/isValidMethod";
import ServerError from "../errors";
import { defaultOnError } from "../errors/render";
import { checkTraversal } from "../http/security";
import define from "../util/define";
import parseResponse, { finalize } from "./parseResponse";
import pathPattern from "./pathPattern";
import { validateRequest, validateResponse } from "./validate";

export default async function handleRequest(
  app: Server,
  reqInfo: ContextParts,
): Promise<Response> {
  const ctx = createContext(app, reqInfo);
  let res = await getResponse(app, ctx);
  // Nobody is left to read it, so there is nothing to finalize, hook or log
  if (ctx.signal.aborted) return res;
  // One exit for every response, routes and onError output alike: CORS,
  // security headers, cache/ETag, credential clearing and Server-Timing.
  res = await finalize(res, ctx);
  // The one "after the response" position (linear middleware has none): a hook
  // over every finalized HTTP response, routes, static, 404s, onError output.
  // Return a Response to replace it (sent verbatim), or nothing to leave it as is.
  if (ctx.options.onResponse) {
    try {
      const replaced = await ctx.options.onResponse(res, ctx);
      if (replaced) res = replaced; // a returned Response replaces; nothing keeps it
    } catch (error) {
      // It runs after finalize, so its own failure is answered here and the
      // error response is finalized in its place
      res = await finalize(await runOnError(error, ctx), ctx);
    }
  }
  // Log the request once the final response is known (no-op unless `log` is on)
  ctx.options.log.request(ctx, res);
  // HEAD keeps the headers (type, cache, ETag...) and drops the body
  if (res.body && ctx.method === "head") {
    res.body.cancel().catch(() => {});
    res = new Response(null, { status: res.status, headers: res.headers });
  }
  return res;
}

// `uploads.validate`, asked once per request that would store files, after
// `ctx.user` is known and before a byte of the body is read.
async function checkUploads(ctx: Context): Promise<void> {
  const { uploads, parser } = ctx.options;
  // `false` is "no files here", so there is nothing to allow or refuse
  if (!uploads || parser === "raw" || parser === "stream") return;
  const { validate } = uploads;
  if (!validate) return;
  // Only the kinds that can become stored files: multipart parts, or the
  // whole raw body as one file
  const kind = bodyKind(String(ctx.headers["content-type"] || ""));
  if (kind !== "multipart" && kind !== "file") return;
  if ((await validate(ctx)) === false) {
    throw ServerError.UPLOAD_NOT_ALLOWED();
  }
}

// The settings a route may set for itself, over the global ones (local wins).
// The route's schemas stay on route.options, so ctx.options carries what its
// Settings type says and nothing else.
const ROUTE_SETTINGS = ["parser", "cache", "uploads"] as const;

function settingsFor(app: Server, route: Route): Settings {
  const local = ROUTE_SETTINGS.filter(
    (key) => route.options[key] !== undefined,
  );
  if (!local.length) return app.settings;
  const merged = { ...app.settings };
  for (const key of local) Object.assign(merged, { [key]: route.options[key] });
  return merged;
}

async function getResponse(app: Server, ctx: Context): Promise<Response> {
  try {
    // Checked here, not in the context builders, so the 405 goes through
    // onError and finalize (CORS headers included) like any other error
    if (!isValidMethod(ctx.method)) {
      throw ServerError.METHOD_NOT_ALLOWED({ method: ctx.method });
    }

    // HEAD is GET without the body (RFC 9110 requires supporting both): an
    // explicit .head() route wins, then GET routes answer with the body
    // stripped at the end of handleRequest
    const routes =
      ctx.method === "head"
        ? [...app.handlers.head, ...app.handlers.get]
        : app.handlers[ctx.method];

    // The first route whose path matches wins; its `fns` already include the
    // middleware registered before it, so the list just runs in order.
    let route: Route | undefined;
    for (const candidate of routes) {
      const params = pathPattern(candidate.path, ctx.url.pathname || "/");
      if (!params) continue;
      route = candidate;
      define(ctx.url, "params", () => params);
      ctx.options = settingsFor(app, route);
      // Reject '../' in params before any handler (or body) touches them
      checkTraversal(params, ctx);
      // Who is asking, before what they sent: a route that stores uploads can
      // then be refused without a byte reaching the bucket.
      await resolveUser(app, ctx);
      // The one place a request can be refused before its files exist, since
      // `.use()` middleware only run once the body has been read.
      await checkUploads(ctx);
      break;
    }

    // Now that the route (and its `parser` mode) is known, read the body once.
    // A `stream` route gets the unread stream; every middleware runs after
    // this, so they all see a read body.
    ctx.body = await resolveBody(
      ctx,
      ctx.options.parser,
      ctx.options.security.maxBodySize,
    );

    if (route) {
      // The route's schemas run before any of its fns, so even the middleware
      // only ever see validated, typed values.
      await validateRequest(ctx, route.options);
      for (const cb of route.fns) {
        // A plain object/array return is the JSON payload the `response`
        // schema describes, so it's checked before being serialized.
        const res = await validateResponse(await cb(ctx), route.options);
        const out = await parseResponse(res, ctx);
        if (out) return out;
      }
    } else {
      // No route matched: the global middleware answer (this is how static
      // files via `assets` answer requests that are not routes)
      for (const mw of app.middleware) {
        const out = await parseResponse(await mw(ctx), ctx);
        if (out) return out;
      }
    }

    throw ServerError.NOT_FOUND();
  } catch (error) {
    // A disconnect cancels whatever was in flight, so what it threw (an
    // AbortError from a fetch, a killed query) is a consequence of leaving,
    // not a fault to render for someone who is no longer listening.
    // 499 is "client closed request": never sent, only a valid Response
    if (ctx.signal.aborted) return new Response(null, { status: 499 });
    // The error response goes through the same finalize() as everything else
    return runOnError(error, ctx);
  }
}

// `onError` is app code and can fail like any other. When it does, or when it
// answers with something that is not a Response, the built-in handler answers
// instead: a broken hook must not escape the pipeline, since everything past
// this point (CORS, security headers, onResponse) would be skipped with it.
async function runOnError(error: any, ctx: Context): Promise<Response> {
  try {
    const out = await ctx.options.onError(error, ctx);
    if (out instanceof Response) return out;
    console.error("[server:error] onError did not return a Response");
  } catch (hookError) {
    console.error(
      `[server:error] onError itself threw: ${(hookError as Error)?.message}`,
    );
  }
  return defaultOnError(error, ctx);
}
