import pathPattern from "../pipeline/pathPattern";
import { status } from "../reply";
import type { Context } from "../types";

// Auto-respond to CORS preflight (OPTIONS) requests when CORS is enabled, so the
// browser gets a 2xx with the right headers (finalize → applyCors adds them).
// preflight runs as a global middleware in every chain, so it defers to a
// user-defined OPTIONS route for the path.
export default function preflight(ctx: Context): Promise<Response> | undefined {
  if (ctx.method !== "options") return;
  if (!ctx.headers["access-control-request-method"]) return;

  // Shape only: a preflight for a path whose typed parameter cannot be cast
  // still needs its headers, and the real request is where that is refused.
  const handled = ctx.app.handlers.options.some((route) =>
    pathPattern(route.path, ctx.url.pathname, false),
  );
  if (handled) return;

  // .send() here rather than returning the chain: the Reply class is internal,
  // so a declaration file cannot name it
  return status(204).send();
}
