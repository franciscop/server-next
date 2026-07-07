import type { CacheOption, Context } from "..";
import { parse } from "./createCookies";
import etag from "./etag";

// Turn the `cache` value into a Cache-Control string, or null when there's
// nothing to set. A duration ('1h') or number of seconds becomes a public
// max-age; `false`/`0` is an explicit no-store, to punch through a global
// default. For anything fancier, set the header yourself with headers().
export function resolveCache(value: CacheOption | undefined | null): string | null {
  if (value === false || value === 0) return "no-store";
  if (typeof value === "number") return `public, max-age=${Math.round(value)}`;
  if (typeof value !== "string") return null;
  const ms = parse(value);
  return ms === null ? null : `public, max-age=${Math.round(ms / 1000)}`;
}

// Applies caching to a finished response. Two independent things:
//
//  1. The Cache-Control default from the route/global `cache` option, set only
//     if the route didn't set one itself (via cache()/headers()), so explicit
//     always wins — the same "set if absent" rule as the security headers.
//  2. A strong ETag for buffered GET responses, with a 304 short-circuit when
//     the client already has that exact body (If-None-Match). Streaming bodies
//     have no content-length and are skipped, since hashing them would mean
//     buffering the whole thing in memory.
//
// Only GET + 200 responses are touched, so mutations and errors are never
// cached. Returns the response to send (possibly a rebuilt one or a 304).
export async function applyCache(out: Response, ctx: Context): Promise<Response> {
  if (ctx.method !== "get" || out.status !== 200) return out;

  if (!out.headers.has("cache-control")) {
    const value = resolveCache(ctx.options.cache);
    if (value) out.headers.set("cache-control", value);
  }

  // content-length present ⇒ a buffered body we can hash; streams don't set it.
  if (out.headers.has("etag") || !out.headers.has("content-length")) return out;

  // arrayBuffer() consumes the body, so the response is rebuilt from the bytes.
  const bytes = new Uint8Array(await out.arrayBuffer());
  const tag = etag(bytes);
  const headers = new Headers(out.headers);
  headers.set("etag", tag);

  // The client already holds this exact body: reply 304 with no body.
  if (ctx.headers["if-none-match"] === tag) {
    headers.delete("content-length");
    return new Response(null, { status: 304, headers });
  }

  return new Response(bytes, { status: 200, headers });
}
