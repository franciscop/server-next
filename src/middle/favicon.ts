import pathPattern from "../pathPattern";
import { file, type } from "../reply";
import type { Context } from "../types";

// Handle GET /favicon.ico:
// - if a `favicon` option is set, serve it from disk (a path) or a Bucket;
// - otherwise reply 204 so the browser stops asking and it doesn't 404.
//
// favicon runs as a global middleware in every chain, so before answering with
// 204 we defer to a user-defined /favicon.ico route (and a public/favicon.ico,
// which `assets` serves earlier still wins).
export default async function favicon(ctx: Context) {
  if (ctx.method !== "get") return;
  if (ctx.url.pathname !== "/favicon.ico") return;

  const fav = ctx.options.favicon;
  if (fav) {
    if (typeof fav === "string") return file(fav);
    const icon = await fav.read("favicon.ico");
    return icon ? type("ico").send(icon) : 204;
  }

  const handled = ctx.app.handlers.get.some((route) =>
    pathPattern(route.path, "/favicon.ico"),
  );
  if (handled) return;

  return 204;
}
