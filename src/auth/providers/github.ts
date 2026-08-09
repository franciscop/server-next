import type { Context } from "../..";
import { ServerError } from "../..";
import { cookies, json } from "../../reply";
import assertUser from "../assertUser";
import finishLogin from "../finishLogin";
import { checkState, clearState, startState } from "../state";
import { clientParams, wantsJson } from "./oauth";

const AUTHORIZE = "https://github.com/login/oauth/authorize";

const oauth = async (code: string, extra: Record<string, string | undefined>) => {
  const fch = async (
    url: string,
    { body, headers = {}, ...rest }: any = {},
  ) => {
    headers.accept = "application/json";
    headers["content-type"] = "application/json";
    const res = await fetch(url, { ...rest, body, headers });
    if (!res.ok) throw new Error("Invalid request");
    return res.json();
  };

  const params: Record<string, string> = {
    client_id: env.GITHUB_ID,
    client_secret: env.GITHUB_SECRET,
    code,
  };
  for (const [key, value] of Object.entries(extra)) {
    if (value) params[key] = value;
  }
  const res = await fch("https://github.com/login/oauth/access_token", {
    method: "post",
    body: JSON.stringify(params),
  });
  return (path: string) => {
    return fch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${res.access_token}` },
    });
  };
};

const authorizeUrl = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams({
    client_id: env.GITHUB_ID,
    scope: "user:email",
  });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${AUTHORIZE}?${search}`;
};

const login = (ctx: Context) => {
  // Client-owned: hand the SPA its authorize URL, no cookie involved
  if (wantsJson(ctx)) {
    return json({ url: authorizeUrl(clientParams(ctx.url.query)) });
  }
  const { state, cookie } = startState(ctx);
  return cookies("oauth_state", cookie).redirect(authorizeUrl({ state }));
};

const getUserProfile = async (
  code: string,
  extra: Record<string, string | undefined> = {},
) => {
  const api = await oauth(code, extra);
  const [profile, emails] = await Promise.all([
    api("/user"),
    api("/user/emails"),
  ]);
  const email = emails.sort((a: any) => (a.primary ? -1 : 1))[0]?.email;
  return { ...profile, email };
};

// The built-in mapper, replaced wholesale by a custom `onProfile`
const defaultProfile = (raw: any) => ({
  id: raw.id,
  name: raw.name,
  email: raw.email,
  picture: raw.avatar_url,
  location: raw.location,
  created: raw.created_at,
});

const finish = async (ctx: Context, raw: any, opts?: { json?: boolean }) => {
  const { onProfile } = ctx.options.auth;
  const profile = onProfile
    ? await onProfile(raw, "github")
    : defaultProfile(raw);
  assertUser(profile, "onProfile");

  return finishLogin(
    ctx,
    {
      provider: "github",
      key: profile.id,
      email: profile.email,
      user: profile,
    },
    opts,
  );
};

const callback = async (ctx: Context) => {
  checkState(ctx, ctx.url.query.state);

  // The `/user` payload, with `email` already resolved from `/user/emails`
  const raw = await getUserProfile(ctx.url.query.code);
  const res = await finish(ctx, raw);
  res.headers.append("set-cookie", clearState());
  return res;
};

const verify = async (ctx: Context) => {
  const { code, redirect_uri, code_verifier } = (ctx.body ?? {}) as any;
  if (!code) throw ServerError.AUTH_NO_CODE();
  const raw = await getUserProfile(code, { redirect_uri, code_verifier });
  return finish(ctx, raw, { json: true });
};

export default { login, callback, verify };
