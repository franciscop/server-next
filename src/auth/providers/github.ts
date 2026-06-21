import type { Context } from "../..";
import { cookies } from "../../reply";
import finishLogin from "../finishLogin";
import { checkState, clearState, startState } from "../state";

const oauth = async (code: string) => {
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

  const res = await fch("https://github.com/login/oauth/access_token", {
    method: "post",
    body: JSON.stringify({
      client_id: env.GITHUB_ID,
      client_secret: env.GITHUB_SECRET,
      code,
    }),
  });
  return (path: string) => {
    return fch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${res.access_token}` },
    });
  };
};

const login = (ctx: Context) => {
  const { state, cookie } = startState(ctx);
  const params = new URLSearchParams({
    client_id: env.GITHUB_ID,
    scope: "user:email",
    state,
  });
  return cookies("oauth_state", cookie).redirect(
    `https://github.com/login/oauth/authorize?${params}`,
  );
};

const getUserProfile = async (code: string) => {
  const api = await oauth(code);
  const [profile, emails] = await Promise.all([
    api("/user"),
    api("/user/emails"),
  ]);
  const email = emails.sort((a: any) => (a.primary ? -1 : 1))[0]?.email;
  return { ...profile, email };
};

const callback = async (ctx: Context) => {
  checkState(ctx, ctx.url.query.state);

  const profile = await getUserProfile(ctx.url.query.code);

  const res = await finishLogin(ctx, {
    provider: "github",
    key: profile.id,
    email: profile.email,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      picture: profile.avatar_url,
      location: profile.location,
      created: profile.created_at,
    },
  });
  res.headers.append("set-cookie", clearState());
  return res;
};

export default { login, callback };
