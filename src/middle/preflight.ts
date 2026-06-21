import pathPattern from "../pathPattern";
import type { Context } from "../types";

// Auto-respond to CORS preflight (OPTIONS) requests when CORS is enabled, so the
// browser gets a 2xx with the right headers (parseResponse → applyCors adds
// them). Without this, the preflight would 404 with no CORS headers and the
// browser would block the actual request. A user-defined OPTIONS route wins.
export default function preflight(ctx: Context) {
  if (ctx.method !== "options") return;
  if (!ctx.headers["access-control-request-method"]) return;

  const handled = ctx.app.handlers.options.some(
    ([method, matcher]) =>
      method !== "*" && pathPattern(matcher, ctx.url.pathname),
  );
  if (handled) return;

  return 204;
}
