import type { AuthSession, AuthUser, Context } from "../..";
import { ServerError, status } from "../..";
import { createId, hash, verify } from "../../helpers";
import updateUser from "../updateUser";

const createSession = async (user: AuthUser, ctx: Context) => {
  const { strategy, session, cleanUser, redirect = "/user" } = ctx.options.auth;
  user = await cleanUser(user);
  const id = createId();
  const provider = "email";
  ctx.user = {
    id,
    strategy,
    provider,
    email: user.email,
  };
  await session.set<AuthSession>(
    id,
    { id, strategy, provider, user: user.email },
    "1w",
  );

  if (!strategy) throw new Error(`Invalid strategy "${strategy}"`);
  if (strategy.includes("token")) {
    return status(201).json({ ...user, token: id });
  }
  if (strategy.includes("cookie")) {
    return status(302).cookies({ authentication: id }).redirect(redirect);
  }
  if (strategy.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (strategy.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
};

async function emailLogin(ctx: Context) {
  const { email, password } = ctx.body as { email: string; password: string };
  if (!email) throw ServerError.LOGIN_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.LOGIN_INVALID_EMAIL();
  if (!password) throw ServerError.LOGIN_NO_PASSWORD();
  if (password.length < 8) throw ServerError.LOGIN_INVALID_PASSWORD();

  const store = ctx.options.auth.store;
  if (!(await store.has(email))) throw ServerError.LOGIN_WRONG_EMAIL();

  const user = await store.get<AuthUser & { password: string }>(email);
  const isValid = await verify(password, user.password);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  return createSession(user, ctx);
}

async function emailRegister(ctx: Context) {
  const { email, password, ...data } = ctx.body as {
    email: string;
    password: string;
  };
  if (!email) throw ServerError.REGISTER_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.REGISTER_INVALID_EMAIL();
  if (!password) throw ServerError.REGISTER_NO_PASSWORD();
  if (password.length < 8) throw ServerError.REGISTER_INVALID_PASSWORD();

  const store = ctx.options.auth.store;
  if (await store.has(email)) throw ServerError.REGISTER_EMAIL_EXISTS();

  const time = new Date().toISOString().replace(/\.[0-9]*/, "");
  const user = {
    id: createId(email),
    strategy: ctx.options.auth.strategy,
    provider: "email" as const,
    email,
    password: await hash(password),
    time,
    ...data,
  };
  await store.set(email, user);

  return createSession(user, ctx);
}

async function emailResetPassword() {
  // const reset = ctx.options.store.prefix("reset:");
  // // Already resetting
  // if (ctx.body.token) {
  //   const { token, password } = ctx.body;
  //   const secret = sha256(token);
  //   const auth = await reset.get(secret);
  //   const user = await store.get(auth.email);
  // } else {
  //   const email = ctx.body.email;
  //   const user = await store.get(email);
  //   const token = createId();
  //   const secret = sha256(token);
  //   await reset.set(secret, { email }, { expires: "2h" });
  //   //
  //   ctx.email.send(
  //     user.email,
  //     `Reset email: <a href="${domain}/auth/reset/email?token=${token}">`
  //   );
  // }
}

async function emailUpdatePassword(ctx: Context) {
  const passwords = ctx.body as { previous: string; updated: string };

  const fullUser = (await ctx.options.auth.store.get(ctx.user.email)) as {
    email: string;
    password: string;
  };
  if (!fullUser) throw ServerError.AUTH_NO_USER();

  const isValid = await verify(passwords.previous, fullUser.password);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  fullUser.password = await hash(passwords.updated);
  await updateUser(fullUser, ctx.user, ctx.options.auth.store);

  return 200;
}

export default {
  login: emailLogin,
  register: emailRegister,
  reset: emailResetPassword,
  password: emailUpdatePassword,
};
