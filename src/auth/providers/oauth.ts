import type { Context, Provider } from "../..";
import { ServerError } from "../..";
import { cookies, json } from "../../reply";
import assertUser from "../assertUser";
import finishLogin from "../finishLogin";
import { checkState, clearState, startState } from "../state";

export type OAuthProfile = {
  id: string | number;
  email?: string;
  name?: string;
  picture?: string;
};

export type OAuthConfig = {
  name: Provider;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  // Map the provider's raw profile response to our normalized user fields
  profile: (raw: any) => OAuthProfile;
};

// The client-owned flow announces itself by asking for JSON
export const wantsJson = (ctx: Context): boolean =>
  String(ctx.headers.accept || "").includes("application/json");

// Extra params the client-owned flow may thread through to the provider: the
// SPA owns its redirect target and its CSRF/PKCE material, we just relay them
export const clientParams = (
  source: Record<string, any>,
): Record<string, string | undefined> => ({
  redirect_uri: source.redirect_uri,
  state: source.state,
  code_challenge: source.code_challenge,
  code_challenge_method: source.code_challenge ? "S256" : undefined,
});

// Builds a standard OAuth2 "authorization code" provider with both flows:
// server-owned ({ login, callback }: redirect + state cookie) and client-owned
// ({ login as JSON, verify }: the SPA redirects itself and posts the code).
// All of Google, Microsoft, Discord and Facebook are just config on top.
export default function oauthProvider(config: OAuthConfig) {
  const KEY = config.name.toUpperCase();
  const callbackUrl = (ctx: Context) =>
    `${ctx.url.origin}/auth/callback/${config.name}`;

  const authorizeUrl = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams({
      client_id: env[`${KEY}_ID`],
      response_type: "code",
      scope: config.scope,
    });
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    return `${config.authorizeUrl}?${search}`;
  };

  const login = (ctx: Context) => {
    // Client-owned: hand the SPA its authorize URL, no cookie involved
    if (wantsJson(ctx)) {
      return json({ url: authorizeUrl(clientParams(ctx.url.query)) });
    }
    const { state, cookie } = startState(ctx);
    const url = authorizeUrl({ redirect_uri: callbackUrl(ctx), state });
    return cookies("oauth_state", cookie).redirect(url);
  };

  // Exchange the authorization code, then fetch the user's profile
  const exchange = async (
    ctx: Context,
    code: string,
    extra: Record<string, string | undefined>,
  ) => {
    const body = new URLSearchParams({
      client_id: env[`${KEY}_ID`],
      client_secret: env[`${KEY}_SECRET`],
      code,
      grant_type: "authorization_code",
    });
    for (const [key, value] of Object.entries(extra)) {
      if (value) body.set(key, value);
    }
    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!tokenRes.ok) throw new Error(`${config.name}: token exchange failed`);
    const token = await tokenRes.json();

    const profileRes = await fetch(config.profileUrl, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token.access_token}`,
      },
    });
    if (!profileRes.ok) throw new Error(`${config.name}: profile fetch failed`);
    return profileRes.json();
  };

  // Map the raw payload into the user (a custom `onProfile` fully replaces
  // this provider's built-in mapper) and finish the login
  const finish = async (ctx: Context, raw: any, opts?: { json?: boolean }) => {
    const { onProfile } = ctx.options.auth;
    const profile = onProfile
      ? await onProfile(raw, config.name)
      : config.profile(raw);
    assertUser(profile, "onProfile");

    return finishLogin(
      ctx,
      {
        provider: config.name,
        key: profile.id,
        email: profile.email,
        user: profile,
      },
      opts,
    );
  };

  const callback = async (ctx: Context) => {
    checkState(ctx, ctx.url.query.state);
    const raw = await exchange(ctx, ctx.url.query.code, {
      redirect_uri: callbackUrl(ctx),
    });
    const res = await finish(ctx, raw);
    res.headers.append("set-cookie", clearState());
    return res;
  };

  const verify = async (ctx: Context) => {
    const { code, redirect_uri, code_verifier } = (ctx.body ?? {}) as any;
    if (!code) throw ServerError.AUTH_NO_CODE();
    const raw = await exchange(ctx, code, { redirect_uri, code_verifier });
    return finish(ctx, raw, { json: true });
  };

  return { login, callback, verify };
}
