import createId from "../../helpers/createId.js";
import { redirect, status } from "../../reply.js";
import type { Context } from "../../types.js";

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

const login = function githubLogin(ctx: Context) {
  return redirect(
    `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_ID}&scope=user:email`,
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
  const { type, cleanUser, store, session, redirect } = ctx.options.auth;

  const profile = await getUserProfile(ctx.url.query.code);

  const auth = {
    id: createId(),
    type,
    provider: "github",
    user: createId(profile.email),
    email: profile.email,
    time: new Date().toISOString().replace(/\.[0-9]*/, ""),
  };
  const user = cleanUser({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    picture: profile.avatar_url,
    location: profile.location,
    created: profile.created_at,
  });

  await store.set(auth.user, user);
  await session.set(auth.id, auth, { expires: "1w" });

  if (auth.type.includes("token")) {
    return status(201).json({ ...user, token: auth.id });
  }
  if (auth.type.includes("cookie")) {
    return status(302).cookies({ authentication: auth.id }).redirect(redirect);
  }
  if (auth.type.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (auth.type.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
};

export default { login, callback };
