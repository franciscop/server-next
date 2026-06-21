import pathPattern from "../pathPattern";
import { file, type } from "../reply";
import type { Context } from "../types";

// Handle GET /favicon.ico:
// - if a `favicon` option is set, serve it from disk (a path) or a Bucket;
// - otherwise reply 204 so the browser stops asking and the request doesn't
//   fall through to a 404. A real user route for it (or a public/favicon.ico,
//   which `assets` serves earlier) still takes precedence.
export default async function favicon(ctx: Context) {
  if (ctx.method !== "get") return;
  if (ctx.url.pathname !== "/favicon.ico") return;

  const fav = ctx.options.favicon;
  if (fav) {
    if (typeof fav === "string") return file(fav);
    const icon = await fav.read("favicon.ico");
    return icon ? type("ico").send(icon) : 204;
  }

  const handled = ctx.app.handlers.get.some(
    ([method, matcher]) =>
      method !== "*" && pathPattern(matcher, "/favicon.ico"),
  );
  if (handled) return;

  return 204;
}
