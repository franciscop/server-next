import pathPattern from "../pathPattern";
import type { Context } from "../types";

// Auto-respond to CORS preflight (OPTIONS) requests when CORS is enabled, so the
// browser gets a 2xx with the right headers (parseResponse → applyCors adds
// them). preflight runs as a global middleware in every chain, so it defers to
// a user-defined OPTIONS route for the path.
export default function preflight(ctx: Context) {
  if (ctx.method !== "options") return;
  if (!ctx.headers["access-control-request-method"]) return;

  const handled = ctx.app.handlers.options.some((route) =>
    pathPattern(route.path, ctx.url.pathname),
  );
  if (handled) return;

  return 204;
}
