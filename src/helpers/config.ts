import parseAuthOptions from "../auth/parseAuthOptions";
import Bucket from "./bucket";
import createId from "./createId";
import createLogger from "./logger";
import { resolveSecurity } from "./security";
import { UploadPipeline } from "./upload";

import type { CorsSettings, LogLevel, Options, Settings } from "..";

export default function config(options: Options = {}): Settings {
  const env = globalThis.env;

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
    body: options.body ?? "parse",
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
  settings.public = options.public ? Bucket(options.public) : null;
  settings.uploads =
    options.uploads instanceof UploadPipeline
      ? options.uploads
      : options.uploads
        ? Bucket(options.uploads)
        : null;

  // Favicon served at /favicon.ico (path or Bucket)
  if (options.favicon) settings.favicon = options.favicon;

  // Stores
  settings.store = options.store ?? null;
  settings.cookies = options.cookies ?? null;
  if (options.session) {
    settings.session =
      "store" in options.session ? options.session : { store: options.session };
  }
  if (options.store && !options.session) {
    settings.session = { store: options.store.prefix("session:") };
  }

  if (options.auth || env.AUTH) {
    settings.auth = parseAuthOptions(options.auth || env.AUTH || null, options);
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

  // OpenAPI
  if (options.openapi) {
    if (options.openapi === true) {
      settings.openapi = {};
    }
    // TODO
  }

  settings.onError =
    options.onError ||
    ((error: Error & { status: number }) => {
      return new Response(error.message || "Server Error", {
        status: error.status || 500,
      });
    });

  // Startup summary: one concise line per configured module (only with `log`)
  const loc = (v: unknown) => (typeof v === "string" ? v : "enabled");
  if (settings.auth) {
    log.message("auth", `${settings.auth.providers.join(", ")} auth enabled`);
  }
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (settings.session) log.message("session", "enabled");
  if (settings.cors) {
    const origin =
      settings.cors.origin === true ? "*" : String(settings.cors.origin);
    log.message("cors", origin);
  }
  if (settings.favicon) log.message("favicon", loc(settings.favicon));
  if (settings.cache !== undefined) log.message("cache", loc(options.cache));
  if (settings.openapi) log.message("openapi", settings.openapi.path || "/docs");

  return settings;
}
