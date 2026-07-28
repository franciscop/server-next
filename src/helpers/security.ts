import ServerError from "../errors";
import type { Context, Options, SecuritySettings } from "..";

// Resolves the `security` option into the static headers to set on every
// response (plus HSTS, which is applied only on production/HTTPS responses).
// The first group is secure-by-default; CSP/COOP/CORP/Permissions-Policy are
// opt-in since a wrong value there breaks apps. `security: false` disables all.
export function resolveSecurity(
  security: Options["security"],
): SecuritySettings {
  const off = security === false;
  const o = security && typeof security === "object" ? security : {};

  // `false` off, `true`/absent uses the default, a string overrides it
  const val = (v: boolean | string | undefined, def: string | null) =>
    v === false ? null : v === true || v == null ? def : v;

  const map: Record<string, string | null> = off
    ? {}
    : {
        "x-frame-options": val(o.frameguard, "SAMEORIGIN"),
        "x-content-type-options": o.noSniff === false ? null : "nosniff",
        "referrer-policy": val(
          o.referrerPolicy,
          "strict-origin-when-cross-origin",
        ),
        "x-xss-protection": o.xssProtection === false ? null : "0",
        // Opt-in: default off
        "content-security-policy": val(o.csp, null),
        "cross-origin-opener-policy": val(o.coop, null),
        "cross-origin-resource-policy": val(o.corp, null),
        "permissions-policy": o.permissionsPolicy ?? null,
      };

  const headers: Record<string, string> = {};
  for (const key in map) {
    const value = map[key];
    if (value) headers[key] = value;
  }

  return {
    trustProxy: o.trustProxy ?? true,
    traversalProtection: off ? false : o.traversalProtection !== false,
    headers,
    hsts: off ? null : val(o.hsts, "max-age=15552000; includeSubDomains"),
  };
}

// Two ways a decoded route param can point outside where it's meant to: a '..'
// segment that climbs (the check Express's `send` runs), and an absolute path,
// which escapes without any dots since resolving against a root just returns
// it. Route params are resource identifiers, so neither is ever legitimate;
// they only show up when a value is meant to be re-read as a path.
const CLIMBS = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const ABSOLUTE = /^(?:[\\/]|[a-zA-Z]:)/;

// Rejects params like '../../.env' or '/etc/hosts' with a 400. Only route
// params are checked: query strings and bodies carry free-form data (a search
// for '..' is valid), and their values aren't paths. Anything that resolves an
// id to a real path (a bucket, the filesystem) still has to enforce its own
// containment, since ids also arrive from those other sources.
export function checkTraversal(params: Record<string, any>, ctx: Context): void {
  if (!ctx.options.security?.traversalProtection) return;
  for (const param in params) {
    const value = params[param];
    if (typeof value !== "string") continue;
    if (CLIMBS.test(value) || ABSOLUTE.test(value)) {
      throw ServerError.PATH_TRAVERSAL({ param, value });
    }
  }
}

// Sets the resolved security headers on the response. Mirrors applyCors: called
// from parseResponse (normal responses) and the error path, so every response
// (routes, static assets, 404s, errors) gets them. Existing headers win, so a
// route that sets its own CSP or frame policy is not overridden.
export function applySecurity(res: Response, ctx: Context): void {
  const security = ctx.options.security;
  if (!security) return;

  for (const key in security.headers) {
    if (!res.headers.has(key)) res.headers.set(key, security.headers[key]);
  }

  // HSTS is only meaningful over HTTPS. Gate on production (the same signal as
  // Secure cookies), which is correct behind a TLS-terminating proxy too.
  if (security.hsts && ctx.platform.production && !res.headers.has("strict-transport-security")) {
    res.headers.set("strict-transport-security", security.hsts);
  }
}
