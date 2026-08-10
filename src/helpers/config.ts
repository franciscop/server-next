import parseAuthOptions from "../auth/parseAuthOptions";
import Bucket from "./bucket";
import createId from "./createId";
import createLogger from "./logger";
import { resolveSecurity } from "./security";
import toStore, { toStoreExpiring } from "./store";
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

  // Logging: off by default (undefined); `info` (or the LOG_LEVEL env var) turns
  // on the startup + request logs.
  const raw = options.log ?? env.LOG_LEVEL;
  const level: LogLevel | undefined =
    raw === true ? "info" : raw === false ? undefined : (raw as LogLevel | undefined);
  const log = createLogger(level);

  const settings: Settings = {
    port: options.port || env.PORT || 3000,
    secret: options.secret || env.SECRET || `unsafe-${createId()}`,
    log,
    // How request bodies are read: parsed into ctx.body by default; `raw` keeps
    // the Buffer, `stream` hands the handler the unread web ReadableStream.
    parser: options.parser ?? "parse",
    // Secure-by-default response headers + trustProxy for ctx.ip. `false` turns
    // the added headers off; see resolveSecurity for the defaults.
    security: resolveSecurity(options.security),
    // Sessions: one record per device, exposed as ctx.session. Anything
    // polystore accepts works; raw sources (a Map, a Redis client) get a 1w
    // expiry, a built store is honored as-is, prefix and expiry included.
    sessions: toStoreExpiring(options.sessions ?? new Map(), "1w"),
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

  // Favicon served at /favicon.ico (path or Bucket)
  const favicon = options.favicon || env.FAVICON;
  if (favicon) settings.favicon = favicon;

  const production = env.NODE_ENV === "production";
  const defaulted = options.sessions == null;
  // Drives a one-time warning on the first session write in production
  settings.sessionsDefault = defaulted;

  if (options.auth || env.AUTH) {
    settings.auth = parseAuthOptions(options.auth || env.AUTH || null);
  }

  // The in-memory defaults lose everything on restart and aren't shared across
  // instances, so a production app with auth must configure real stores. Every
  // strategy needs `users` (each login reads it for the existing-user upsert
  // and persists the record); only `sessions` is skipped by the stateless
  // `jwt`, which has no ctx.session at all.
  if (settings.auth) {
    if (!settings.auth.users) {
      if (production) {
        throw new Error(
          "Auth in production needs a persistent `users` store, like " +
            "auth: { ..., users: kv(redis).prefix('user:') }.",
        );
      }
      settings.auth.users = toStore(new Map());
    }
    if (production && defaulted && !settings.auth.strategy.includes("jwt")) {
      throw new Error(
        "Auth in production needs a persistent `sessions` store, like " +
          "sessions: kv(redis).prefix('session:').",
      );
    }
  }

  // The `jwt` strategy signs tokens with `secret`. With no secret set, config
  // generates a random `unsafe-` one per process, which would invalidate every
  // token on restart and across instances, so warn loudly (always, not gated on
  // the `log` level, since it silently breaks auth).
  if (
    settings.auth?.strategy.includes("jwt") &&
    settings.secret.startsWith("unsafe-")
  ) {
    console.warn(
      "[server:auth] jwt strategy with no SECRET set: tokens are signed with a " +
        "random per-process secret, so they break on restart and across " +
        "instances. Set the SECRET environment variable (or the `secret` option).",
    );
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
  if (settings.auth) {
    log.message("auth", `${settings.auth.providers.join(", ")} auth enabled`);
  }
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (options.sessions) log.message("sessions", "enabled");
  if (settings.cors) {
    const origin =
      settings.cors.origin === true ? "*" : String(settings.cors.origin);
    log.message("cors", origin);
  }
  if (settings.favicon) log.message("favicon", loc(settings.favicon));
  if (settings.cache !== undefined) log.message("cache", loc(options.cache));
  if (settings.openapi) log.message("openapi", settings.openapi.path);

  return settings;
}
