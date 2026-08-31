import { resolveCache } from "../http/cache";
import { mimeOf } from "../http/mimes";
import parseRange from "../http/parseRange";
import { status, type } from "../reply";
import type { Context } from "../types";

// What an asset is cached for when the app hasn't said. A global `cache`
// replaces it, including `cache: false`, so turning caching off turns it off
// here too.
const DEFAULT_CACHE = "public, max-age=3600";

// Runs before the route handlers: an existing public file wins over a
// same-named route by design, and the route is the fallback.
export default async function assets(ctx: Context) {
  if (!ctx.options.public) return;
  if (ctx.method !== "get" && ctx.method !== "head") return;
  // The homepage _cannot_ be a file by definition. We could consider sending
  // `index.html`, but that's easy with `.get('/', () => file('index.html'))
  if (ctx.url.pathname === "/") return;
  try {
    // Bucket keys are relative; strip the leading slash from the request path
    // (our built-in bucket tolerates it, but a real `bucket` treats "/x" != "x").
    const key = ctx.url.pathname.replace(/^\/+/, "");
    const file = ctx.options.public.file(key);

    // info() (size + mtime) gives a validator we can compute without reading the
    // bytes, and null when the file is missing. Buckets without info() fall back
    // to a bare existence check, so `hasInfo` tells the two "no meta" cases apart.
    const info = file.info?.bind(file);
    const meta = info ? await info() : null;
    if (info ? !meta : !(await file.exists())) return;

    // Our own MIME table wins over the bucket's, since it carries the charset
    // for text types; the bucket's type covers extensions we don't know.
    const ext = ctx.url.pathname.split(".").pop()?.toLowerCase();
    const ctype = mimeOf(ctx.url.pathname) || meta?.type || ext;
    const headers: Record<string, string> = {
      "cache-control": resolveCache(ctx.options.cache) ?? DEFAULT_CACHE,
    };

    let tag: string | undefined;
    if (meta) {
      const stamp = meta.modified ? meta.modified.getTime() : 0;
      // Weak validator (size + mtime), since we don't read the bytes to hash.
      tag = `W/"${meta.size.toString(16)}-${stamp.toString(16)}"`;
      headers.etag = tag;
      if (meta.modified) headers["last-modified"] = meta.modified.toUTCString();
    }

    // We can only honor ranges when the bucket can slice and we know the size.
    const canRange = !!(meta && file.slice);
    if (canRange) headers["accept-ranges"] = "bytes";

    // Conditional request: unchanged asset -> 304 with no body.
    if (tag && ctx.headers["if-none-match"] === tag) {
      return status(304).headers(headers).send();
    }

    // Range request. `If-Range` that no longer matches our validator falls back
    // to a full 200 (the client's cached range would be stale).
    const rangeHeader = ctx.headers.range as string | undefined;
    const ifRange = ctx.headers["if-range"] as string | undefined;
    if (meta && file.slice && rangeHeader && (!ifRange || ifRange === tag)) {
      const range = parseRange(rangeHeader, meta.size);
      if (range === "unsatisfiable") {
        return status(416)
          .headers({ ...headers, "content-range": `bytes */${meta.size}` })
          .send();
      }
      if (range) {
        const { start, end } = range;
        return type(ctype)
          .status(206)
          .headers({
            ...headers,
            "content-range": `bytes ${start}-${end}/${meta.size}`,
            "content-length": String(end - start + 1),
          })
          // slice() is a file view (end exclusive); stream just that range.
          .send(file.slice(start, end + 1).stream());
      }
    }

    return type(ctype).headers(headers).send(file.stream());
  } catch {
    // NO-OP; if there's no file, keep going the normal flow
  }
}
