import type { AuthProfile, Context, ProviderOptions } from "../../types";
import toArray from "../../util/toArray";
import type { Pending } from "../state";

export type Provider = {
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

// Credentials come from the environment by name, and can be given explicitly
export const credentials = (name: string, options: ProviderOptions) => ({
  id: options.id ?? env[`${name.toUpperCase()}_ID`],
  secret: options.secret ?? env[`${name.toUpperCase()}_SECRET`],
});

// Anything we do not recognise is passed straight through to the provider,
// which is how `prompt`, `team` and `tenant` work with no code here
export const passthrough = (options: ProviderOptions) => {
  const { id, secret, scope, issuer, ...rest } = options;
  return rest as Record<string, string>;
};

export const scopeOf = (options: ProviderOptions, fallback: string) =>
  toArray(options.scope ?? fallback).join(" ");

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
