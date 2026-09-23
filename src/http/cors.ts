import type { Context, Method } from "..";

export type CorsSettings = {
  origin: string | boolean;
  methods: string;
  headers: string;
  credentials?: boolean;
};

export type CorsOptions =
  | boolean
  | string
  | string[]
  | {
      origin?: string | string[];
      methods?: string | Method[];
      headers?: string | string[];
      credentials?: boolean;
    };

const DEFAULT_METHODS = "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS";
const csv = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(",") : value;

// Every accepted form of the `cors` option resolved into one shape: origins
// as a lowercase CSV, or `true` to reflect the request's own origin.
export function resolveCors(
  option?: CorsOptions | null,
): CorsSettings | undefined {
  if (!option) return undefined;
  const settings: CorsSettings = {
    origin: "",
    methods: DEFAULT_METHODS,
    headers: "*",
  };

  if (option === true) {
    settings.origin = true;
  } else if (typeof option === "string" || Array.isArray(option)) {
    settings.origin = csv(option);
  } else if (typeof option === "object") {
    // An object with no origin is still "CORS on", for every origin
    settings.origin = option.origin ? csv(option.origin) : "*";
    if ("methods" in option) settings.methods = csv(option.methods as string);
    if ("headers" in option) settings.headers = csv(option.headers as string);
    if (option.credentials) settings.credentials = true;
  }

  // Reflecting any origin with credentials lets every website make logged-in
  // requests and read the answers
  const origins = String(settings.origin).split(/\s*,\s*/);
  if (settings.credentials && origins.includes("*")) {
    throw new Error(
      "CORS `credentials: true` needs the exact origins allowed, like " +
        "`cors: { origin: 'https://app.example.com', credentials: true }`; " +
        "with any origin, every website could make logged-in requests.",
    );
  }

  if (typeof settings.origin === "string") {
    settings.origin = settings.origin.toLowerCase();
  }
  return settings;
}

const localhost = /^https?:\/\/localhost(:\d+)?$/;

// Based on https://expressjs.com/en/resources/middleware/cors.html#configuration-options
// Arrays never arrive here: resolveCors() joins every array form to a CSV.
function cors(
  config: boolean | string,
  origin: string = "",
  production = false,
): string | null {
  origin = origin?.toLowerCase();

  // When it's true, reflect the origin
  if (config === true) return origin || null;

  // A star should always return a star
  if (config === "*") return "*";

  // No origin, it's okay since that means we don't need CORS
  if (!origin) return null;

  // Local development just works; in production localhost is any origin,
  // and a page on someone's machine must not reach a credentialed API
  if (!production && localhost.test(origin)) return origin;

  const arr = typeof config === "string" ? config.split(/\s*,\s*/g) : [];
  if (arr.includes(origin)) return origin;

  console.warn(`CORS: Origin "${origin}" not allowed. Allowed "${config}"`);
  return null;
}

// Set the CORS headers on a response based on the request context. Called from
// finalize(), which every response goes through, so that browsers can always
// read the response (a CORS error response with no headers is opaque).
export function applyCors(res: Response, ctx: Context): void {
  const settings = ctx.options.cors;
  if (!settings) return;

  const requestOrigin = (ctx.headers.origin as string) || "";
  const origin = cors(settings.origin, requestOrigin, ctx.platform.production);
  if (!origin) return;

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
