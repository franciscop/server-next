import { applyCache, applyCors, applySecurity } from "./helpers";
import { send } from "./reply";

import type { Context } from ".";

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
    out = new Response(null, { status: out });
  }

  // Everything else is a body, and `send()` is the single place that knows how
  // to serialize one: strings, JSON, bytes, streams, files, JSX, promises...
  // A Response is already the answer and passes straight through, except one
  // from fetch(): send() copies that one and drops the content-encoding of a
  // body fetch has already decoded.
  if (!(out instanceof Response) || out.url) {
    out = await send(out);
  }

  // If we have CORS, set the proper headers up
  applyCors(out, ctx);

  // Secure-by-default response headers (X-Frame-Options, nosniff, HSTS, ...)
  applySecurity(out, ctx);

  // Cache-Control default (route/global `cache`) + auto-ETag with a 304
  // short-circuit. May rebuild `out`, so it runs before the headers below.
  out = await applyCache(out, ctx);

  // A credential that can never verify again (a rotated secret, an upgrade)
  // is cleared, so a refresh starts clean instead of failing the same way
  if ((ctx as any).clearCookie) {
    out.headers.append(
      "set-cookie",
      `${(ctx as any).clearCookie}=; Path=/; Max-Age=0; HttpOnly`,
    );
  }

  // Only attach the headers if the user is using the timing API
  // 1 item is the `init` so it doesn't count
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }

  return out;
}
