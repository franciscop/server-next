import parseAuth from "../auth/parse";
import Bucket from "./bucket";
import createLogger from "./logger";
import { resolveSecrets } from "./secrets";
import { resolveSecurity } from "./security";
import { resolveUploads } from "./upload";

import type { CorsSettings, LogLevel, Options, Settings } from "..";

export default function config(options: Options = {}): Settings {
  const env = globalThis.env;

  // Schemas are per-route only, and the old root `body` mode is now `parser`;
  // both mistakes fail loudly here instead of being silently ignored.
  const opts = options as Record<string, unknown>;
  if (typeof opts.body === "string") {
    throw new Error(
      `The root \`body: '${opts.body}'\` option is now \`parser: '${opts.body}'\`.`,
    );
  }
  for (const key of ["body", "query", "params", "response"]) {
    if (opts[key] !== undefined) {
      throw new Error(
        `\`${key}\` is a route option, not a root one; pass it per route, ` +
          `like .post('/', { ${key} }, handler).`,
      );
    }
  }

  if (opts.secret !== undefined) {
    throw new Error(
      "The `secret` option is now `secrets`, and takes one key or several: " +
        "`secrets: [current, previous]` signs with the first and verifies " +
        "with any, so rotating a key no longer signs everyone out.",
    );
  }
  if (env.SECRET && !env.SECRETS) {
    throw new Error(
      "The SECRET environment variable is now SECRETS, a comma-separated " +
        "list. Rename it, or every token signed with the old key breaks.",
    );
  }

  // Logging: off by default (undefined); `info` (or the LOG_LEVEL env var) turns
  // on the startup + request logs.
  const raw = options.log ?? env.LOG_LEVEL;
  const level: LogLevel | undefined =
    raw === true ? "info" : raw === false ? undefined : (raw as LogLevel | undefined);
  const log = createLogger(level);

  const settings: Settings = {
    // `env.PORT` is a string, so coerce it: `settings.port` is a number
    port: options.port || Number(env.PORT) || 3000,
    secrets: resolveSecrets(options.secrets),
    log,
    // How request bodies are read: parsed into ctx.body by default; `raw` keeps
    // the Buffer, `stream` hands the handler the unread web ReadableStream.
    parser: options.parser ?? "parse",
    // Secure-by-default response headers + trustProxy for ctx.ip. `false` turns
    // the added headers off; see resolveSecurity for the defaults.
    security: resolveSecurity(options.security),
  };

  // Response caching: a default Cache-Control for GET responses, plus auto-ETag.
  // Kept raw (resolved per-request in applyCache) so a route's `cache` option can
  // override it the same way `body` does. Off by default.
  if (options.cache !== undefined) settings.cache = options.cache;

  // CORS
  options.cors = options.cors || env.CORS || null;
  if (options.cors) {
    const cors: CorsSettings = {
      origin: "",
      methods: "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
      headers: "*",
    };

    // TODO: replace '*' for request url
    if (options.cors === true) {
      cors.origin = true;
    } else if (typeof options.cors === "string") {
      cors.origin = options.cors;
    } else if (Array.isArray(options.cors)) {
      cors.origin = options.cors.join(",");
    } else if (typeof options.cors === "object") {
      if (!options.cors.origin) {
        // cors is defined {}, but no explicit origin
        cors.origin = "*";
      } else if (typeof options.cors.origin === "string") {
        cors.origin = options.cors.origin;
      } else if (Array.isArray(options.cors.origin)) {
        cors.origin = options.cors.origin.join(",");
      }

      if ("methods" in options.cors) {
        cors.methods = Array.isArray(options.cors.methods)
          ? options.cors.methods.join(",")
          : options.cors.methods;
      }

      if ("headers" in options.cors) {
        cors.headers = Array.isArray(options.cors.headers)
          ? options.cors.headers.join(",")
          : options.cors.headers;
      }

      if (options.cors.credentials) {
        cors.credentials = true;
      }
    }

    if (typeof cors.origin === "string") {
      cors.origin = cors.origin.toLowerCase();
    }

    settings.cors = cors;
  }

  // Bucket
  const publicDir = options.public || env.PUBLIC;
  settings.public = publicDir ? Bucket(publicDir) : null;
  // uploads: every form resolves to the same shape, `{ bucket, maxSize,
  // minSize, fileType }`, with the bucket resolved and undefined leaves meaning
  // "no limit". Limits make parseBody buffer each file to check it before
  // writing; without them files stream straight through.
  settings.uploads = resolveUploads(options.uploads);

  const production = env.NODE_ENV === "production";

  if (options.auth || env.AUTH) {
    // The env string is validated (and rejected) inside parseAuthOptions
    settings.auth = parseAuth(
      options.auth || (env.AUTH as Options["auth"]) || null,
    );
  }

  // Every credential is signed with the first `secrets` entry. With none set,
  // config generates a random `unsafe-` one per process, which would
  // invalidate every credential on restart and across instances: a warning in
  // development, a refusal in production.
  if (settings.auth?.name === "flow" && settings.secrets[0].startsWith("unsafe-")) {
    const message =
      "Auth needs a stable secret: credentials are signed with it, and the " +
      "random per-process fallback breaks them on restart and across " +
      "instances. Set the SECRETS environment variable (or the `secrets` option).";
    if (env.NODE_ENV === "production") throw new Error(message);
    console.warn(`[server:auth] ${message}`);
  }

  // OpenAPI: the generated spec, served at its conventional path by default.
  // There's no built-in viewer; the docs show the copy-paste shell for one.
  if (options.openapi) {
    const o = options.openapi;
    if (o === true) settings.openapi = { path: "/openapi.json" };
    else if (typeof o === "string") settings.openapi = { path: o };
    else settings.openapi = { path: "/openapi.json", ...o };
  }

  settings.onError =
    options.onError ||
    ((error: Error & { status: number }) => {
      return new Response(error.message || "Server Error", {
        status: error.status || 500,
      });
    });

  // Optional "after the response" hook; undefined simply means no hook.
  settings.onResponse = options.onResponse;

  // Startup summary: one concise line per configured module (only with `log`)
  const loc = (v: unknown) => (typeof v === "string" ? v : "enabled");
  if (settings.auth) log.message("auth", `${settings.auth.name} enabled`);
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (settings.cors) {
    const origin =
      settings.cors.origin === true ? "*" : String(settings.cors.origin);
    log.message("cors", origin);
  }
  if (settings.cache !== undefined) log.message("cache", loc(options.cache));
  if (settings.openapi) log.message("openapi", settings.openapi.path);

  return settings;
}
