import type { Context, Provider } from "../..";
import { cookies } from "../../reply";
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

// Builds a standard OAuth2 "authorization code" provider ({ login, callback })
// using plain fetch, mirroring the github provider's store/session behavior.
// All of Google, Microsoft, Discord and Facebook are just config on top of this.
export default function oauthProvider(config: OAuthConfig) {
  const KEY = config.name.toUpperCase();
  const callbackUrl = (ctx: Context) =>
    `${ctx.url.origin}/auth/callback/${config.name}`;

  const login = (ctx: Context) => {
    const { state, cookie } = startState(ctx);
    const params = new URLSearchParams({
      client_id: env[`${KEY}_ID`],
      redirect_uri: callbackUrl(ctx),
      response_type: "code",
      scope: config.scope,
      state,
    });
    return cookies("oauth_state", cookie).redirect(
      `${config.authorizeUrl}?${params}`,
    );
  };

  const callback = async (ctx: Context) => {
    checkState(ctx, ctx.url.query.state);

    // 1. Exchange the authorization code for an access token
    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env[`${KEY}_ID`],
        client_secret: env[`${KEY}_SECRET`],
        code: ctx.url.query.code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(ctx),
      }),
    });
    if (!tokenRes.ok) throw new Error(`${config.name}: token exchange failed`);
    const token = await tokenRes.json();

    // 2. Fetch the user's profile with the access token
    const profileRes = await fetch(config.profileUrl, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token.access_token}`,
      },
    });
    if (!profileRes.ok) throw new Error(`${config.name}: profile fetch failed`);
    const raw = await profileRes.json();

    // 3. Map the raw payload into the user: a custom `onProfile` fully
    // replaces this provider's built-in mapper
    const { onProfile } = ctx.options.auth;
    const profile = onProfile
      ? await onProfile(raw, config.name)
      : config.profile(raw);
    assertUser(profile, "onProfile");

    // 4. Persist the user + session and respond per strategy
    const res = await finishLogin(ctx, {
      provider: config.name,
      key: profile.id,
      email: profile.email,
      user: profile,
    });
    res.headers.append("set-cookie", clearState());
    return res;
  };

  return { login, callback };
}
