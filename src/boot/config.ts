import parseAuth from "../auth/parse";
import Bucket from "../body/bucket";
import createLogger from "./logger";
import { resolveSecrets } from "./secrets";
import { resolveCors } from "../http/cors";
import { resolveSecurity } from "../http/security";
import { resolveUploads } from "../body/upload";

import type { LogLevel, Options, Settings } from "..";
import { defaultOnError } from "../errors/render";

// One line, once, so nobody ships a development build by accident. Skipped
// under the test runner, where it would be noise on every server built.
let announced = false;
function announceDevelopment(): void {
  if (announced || env.NODE_ENV === "production" || env.NODE_ENV === "test") {
    return;
  }
  announced = true;
  console.warn(
    "[server:app] Running in development mode. Set NODE_ENV=production when " +
      "you deploy.",
  );
}

// Options that were renamed, or that only exist per route, fail loudly here
// instead of being silently ignored.
function rejectMisplacedOptions(options: Options): void {
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

  const sec = opts.security as Record<string, unknown> | undefined;
  if (sec && typeof sec === "object" && sec.maxBody !== undefined) {
    throw new Error(
      "The `security.maxBody` option is now `security.maxBodySize`, to sit " +
        "alongside the `uploads` limits `maxFileSize` and `maxTotalSize`.",
    );
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
}

// Off by default; `true` or `'info'` (option or LOG_LEVEL) turns logging on
function resolveLogLevel(raw: unknown): LogLevel | undefined {
  if (raw === true) return "info";
  if (raw === false) return undefined;
  return raw as LogLevel | undefined;
}

// The generated spec, served at its conventional path unless told otherwise
function resolveOpenapi(option: Options["openapi"]): Settings["openapi"] {
  if (!option) return undefined;
  if (option === true) return { path: "/openapi.json" };
  if (typeof option === "string") return { path: option };
  return { path: "/openapi.json", ...option };
}

// Every credential is signed with the first `secrets` entry. With none set, a
// random `unsafe-` one is generated per process, which invalidates every
// credential on restart and across instances: a warning in development, a
// refusal in production.
function checkAuthSecret(settings: Settings): void {
  if (settings.auth?.name !== "flow") return;
  if (!settings.secrets[0].startsWith("unsafe-")) return;
  const message =
    "Auth needs a stable secret: credentials are signed with it, and the " +
    "random per-process fallback breaks them on restart and across " +
    "instances. Set the SECRETS environment variable (or the `secrets` option).";
  if (env.NODE_ENV === "production") throw new Error(message);
  console.warn(`[server:auth] ${message}`);
}

// One concise line per configured module, only when logging is on
function logSummary(settings: Settings, options: Options): void {
  const { log } = settings;
  const loc = (v: unknown) => (typeof v === "string" ? v : "enabled");
  if (settings.auth) {
    const { name, providers } = settings.auth;
    log.message("auth", `${providers?.join(",") ?? name} enabled`);
  }
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (settings.cors) {
    const { origin } = settings.cors;
    log.message("cors", origin === true ? "*" : String(origin));
  }
  if (settings.cache !== undefined) log.message("cache", loc(options.cache));
  if (settings.openapi) log.message("openapi", settings.openapi.path);
}

export default function config(options: Options = {}): Settings {
  announceDevelopment();
  rejectMisplacedOptions(options);

  const publicDir = options.public || env.PUBLIC;
  const auth = options.auth || env.AUTH;

  const settings: Settings = {
    // `env.PORT` is a string, so coerce it: `settings.port` is a number
    port: options.port || Number(env.PORT) || 3000,
    secrets: resolveSecrets(options.secrets),
    log: createLogger(resolveLogLevel(options.log ?? env.LOG_LEVEL)),
    parser: options.parser ?? "auto",
    security: resolveSecurity(options.security),
    // Kept raw, resolved per request in applyCache, so a route can override it
    cache: options.cache,
    public: publicDir ? Bucket(publicDir) : null,
    uploads: resolveUploads(options.uploads),
    cors: resolveCors(options.cors || env.CORS),
    // The env string is validated (and rejected) inside parseAuth
    auth: auth ? parseAuth(auth as Options["auth"]) : undefined,
    openapi: resolveOpenapi(options.openapi),
    onError: options.onError || defaultOnError,
    onResponse: options.onResponse,
  };
  checkAuthSecret(settings);
  logSummary(settings, options);
  return settings;
}
