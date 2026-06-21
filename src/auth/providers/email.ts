import type { AuthUser, Context } from "../..";
import { ServerError } from "../..";
import { createId, hash, verify } from "../../helpers";
import finishLogin from "../finishLogin";
import updateUser from "../updateUser";

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

  // The user is already stored; store:false avoids re-saving without a password
  return finishLogin(ctx, {
    provider: "email",
    key: user.email,
    email: user.email,
    user,
    store: false,
  });
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

  return finishLogin(ctx, {
    provider: "email",
    key: email,
    email,
    user,
    store: false,
  });
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
