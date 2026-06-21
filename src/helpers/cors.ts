import type { Context } from "..";

const localhost = /^https?:\/\/localhost(:\d+)?$/;

// Based on https://expressjs.com/en/resources/middleware/cors.html#configuration-options
export default function cors(
  config: boolean | string | string[],
  origin: string = "",
): string | null {
  origin = origin?.toLowerCase();

  // When it's true, reflect the origin
  if (config === true) return origin || null;

  // A star should always return a star
  if (config === "*") return "*";

  // No origin, it's okay since that means we don't need CORS
  if (!origin) return null;

  // Coming from localhost
  if (localhost.test(origin)) return origin;

  const arr = Array.isArray(config)
    ? config
    : typeof config === "string"
      ? config.split(/\s*,\s*/g)
      : [];
  if (arr.includes(origin)) return origin;

  console.warn(`CORS: Origin "${origin}" not allowed. Allowed "${config}"`);
  return null;
}

// Set the CORS headers on a response based on the request context. Used both on
// the happy path (parseResponse) and on errors/preflight, so that browsers can
// always read the response (a CORS error response with no headers is opaque).
export function applyCors(res: Response, ctx: Context): void {
  const settings = ctx.options.cors;
  if (!settings) return;

  const requestOrigin = (ctx.headers.origin as string) || "";
  let origin = cors(settings.origin, requestOrigin);
  if (!origin) return;

  // Credentialed requests can't use the "*" wildcard; the spec requires the
  // exact origin to be reflected, so fall back to the request's own origin.
  if (settings.credentials && origin === "*") {
    if (!requestOrigin) return;
    origin = requestOrigin.toLowerCase();
  }

  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", settings.methods);
  res.headers.set("Access-Control-Allow-Headers", settings.headers);
  if (settings.credentials) {
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Caches must vary on Origin whenever we reflect a specific one
  if (origin !== "*") res.headers.append("Vary", "Origin");

  // Cache the preflight result to avoid an OPTIONS round-trip on every request
  if (ctx.method === "options") {
    res.headers.set("Access-Control-Max-Age", "86400");
  }
}
