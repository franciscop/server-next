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
    headers,
    hsts: off ? null : val(o.hsts, "max-age=15552000; includeSubDomains"),
  };
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
