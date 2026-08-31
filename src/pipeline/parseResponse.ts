import { applyCache } from "../http/cache";
import { applyCors } from "../http/cors";
import { applySecurity } from "../http/security";
import { clearCookie, toClear } from "../http/createCookies";
import { send } from "../reply";

import type { Context } from "../index";

// Coerce whatever a handler returned into a Response, or null to keep going.
// Serialization only: the cross-cutting headers are applied in finalize().
export default async function parseResponse(
  out: any,
  ctx: Context,
): Promise<Response | null> {
  // Nothing to send: the chain keeps going, and ends in a 404 if no one answers
  if (!out && typeof out !== "string") return null;

  // A lazy handler: a function returned from a route is called with the
  // context. (A JSX element is also a function, and simply ignores the arg.)
  if (typeof out === "function") {
    out = await out(ctx);
    if (!out && typeof out !== "string") return null;
  }

  // A bare number is a status code, the one place `return x` and `send(x)`
  // differ: `send(201)` means "this is the body", `return 201` means the status
  if (typeof out === "number") {
    return new Response(null, { status: out });
  }

  // Everything else is a body, and `send()` is the single place that knows how
  // to serialize one: strings, JSON, bytes, streams, files, JSX, promises...
  // A Response is already the answer and passes straight through, except one
  // from fetch(): send() copies that one and drops the content-encoding of a
  // body fetch has already decoded.
  if (!(out instanceof Response) || out.url) {
    out = await send(out);
  }

  return out;
}

// Every response leaves through here exactly once, success and error alike,
// so the error path can never silently lose a cross-cutting header again.
export async function finalize(out: Response, ctx: Context): Promise<Response> {
  // If we have CORS, set the proper headers up; otherwise a browser can't
  // even read the status of a cross-origin request (including errors)
  applyCors(out, ctx);

  // Secure-by-default response headers (X-Frame-Options, nosniff, HSTS, ...)
  applySecurity(out, ctx);

  // Cache-Control default (route/global `cache`) + auto-ETag with a 304
  // short-circuit. May rebuild `out`, so it runs before the headers below.
  out = await applyCache(out, ctx);

  // A credential that can never verify again (a rotated secret, an upgrade)
  // is cleared, so a refresh starts clean instead of failing the same way
  const stale = toClear(ctx);
  if (stale) {
    out.headers.append("set-cookie", clearCookie(stale));
  }

  // Only attach the headers if the user is using the timing API
  // 1 item is the `init` so it doesn't count
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }

  return out;
}
