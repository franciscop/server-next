import { etag } from "../helpers";
import { status, type } from "../reply";
import type { BucketFile, Context } from "../types";

// 1 day of cache
const CACHE_CONTROL = "public, max-age=86400";
const ext = (name: string) => name.split(".").pop() || "ico";

async function loadFavicon(
  fav: string | BucketFile,
): Promise<{ bytes: Buffer; type: string; etag: string } | null> {
  try {
    const type = ext(typeof fav === "string" ? fav : fav?.name);
    const bytes =
      typeof fav === "string"
        ? await (await import("node:fs/promises")).readFile(fav)
        : Buffer.from(await fav.bytes());
    return { bytes, type, etag: etag(bytes) };
  } catch {
    return null;
  }
}

export default async function favicon(ctx: Context) {
  const fav = ctx.options.favicon;
  if (!fav) return; // registered only when configured; defensive

  // If it's null we want to skip it, so do not simplify
  if (ctx.app.faviconCache === undefined) {
    ctx.app.faviconCache = await loadFavicon(fav);
  }
  const entry = ctx.app.faviconCache;
  if (!entry) return 204; // configured but the file is missing

  const headers = { "cache-control": CACHE_CONTROL, etag: entry.etag };
  if (ctx.headers["if-none-match"] === entry.etag) {
    return status(304).headers(headers).send();
  }

  return type(entry.type).headers(headers).send(entry.bytes);
}
