import type { AuthProfile, Context, ProviderOptions } from "../../types";
import toArray from "../../util/toArray";
import type { Pending } from "../state";

export type Provider = {
  // Throws, at boot, when the options and environment cannot run a login:
  // the message names the option or variable that is missing
  check: (options: ProviderOptions) => void;
  // Where to send the person, plus the CSRF state and anything that must
  // survive the redirect without appearing in the URL (a PKCE verifier)
  authorize: (
    ctx: Context,
    options: ProviderOptions,
  ) => Promise<{ url: string; state: string; payload?: Record<string, any> }>;
  // The code back into a profile, with what `authorize` set aside
  exchange: (
    ctx: Context,
    options: ProviderOptions,
    code: string,
    pending: Pending,
  ) => Promise<AuthProfile>;
};

// For an issuer found by discovery. Every named provider reads its own, under
// the same <PROVIDER>_CLIENT_ID / <PROVIDER>_CLIENT_SECRET convention.
export const credentials = (name: string, options: ProviderOptions) => ({
  id: options.clientId ?? env[`${name.toUpperCase()}_CLIENT_ID`],
  secret: options.clientSecret ?? env[`${name.toUpperCase()}_CLIENT_SECRET`],
});

// Anything we do not recognise is passed straight through to the provider,
// which is how `prompt`, `team` and `tenant` work with no code here
export const passthrough = (options: ProviderOptions) => {
  const { clientId, clientSecret, scopes, issuer, ...rest } = options;
  return rest as Record<string, string>;
};

export const scopeOf = (options: ProviderOptions, fallback: string) =>
  toArray(options.scopes ?? fallback).join(" ");

// The mounted route and the redirect_uri sent to the provider must agree;
// both derive from here so they cannot drift.
export const callbackPath = (name: string) => `/auth/callback/${name}`;
export const callbackUrl = (ctx: Context, name: string) =>
  `${ctx.url.origin}${callbackPath(name)}`;

export const search = (base: string, params: Record<string, any>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  return `${base}?${query}`;
};
