import { createId, hash, verify } from "../../helpers";
import { ServerError, status } from "../..";
import updateUser from "../updateUser";
import type { Context } from "../..";

const createSession = async (user: any, ctx: Context) => {
  const { type, session, cleanUser, redirect = "/user" } = ctx.options.auth;
  user = cleanUser(user);
  const id = createId();
  const provider = "email";
  const time = new Date().toISOString().replace(/\.[0-9]*/, "");
  ctx.auth = {
    id,
    type,
    provider,
    user: user.email,
    email: user.email,
    time,
  };
  await session.set(id, ctx.auth, { expires: "1w" });

  if (type.includes("token")) {
    return status(201).json({ ...user, token: id });
  }
  if (type.includes("cookie")) {
    return status(302).cookies({ authentication: id }).redirect(redirect);
  }
  if (type.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (type.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
};

async function emailLogin(ctx: Context) {
  const { email, password } = ctx.body;
  if (!email) throw ServerError.LOGIN_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.LOGIN_INVALID_EMAIL();
  if (!password) throw ServerError.LOGIN_NO_PASSWORD();
  if (password.length < 8) throw ServerError.LOGIN_INVALID_PASSWORD();

  const store = ctx.options.auth.store;
  if (!(await store.has(email))) throw ServerError.LOGIN_WRONG_EMAIL();

  const user = await store.get(email);
  const isValid = await verify(password, user.password);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  return createSession(user, ctx);
}

async function emailRegister(ctx: Context) {
  const { email, password, ...data } = ctx.body;
  if (!email) throw ServerError.REGISTER_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.REGISTER_INVALID_EMAIL();
  if (!password) throw ServerError.REGISTER_NO_PASSWORD();
  if (password.length < 8) throw ServerError.REGISTER_INVALID_PASSWORD();

  const store = ctx.options.auth.store;
  if (await store.has(email)) throw ServerError.REGISTER_EMAIL_EXISTS();

  const time = new Date().toISOString().replace(/\.[0-9]*/, "");
  const user = {
    id: createId(email),
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
  const { previous, updated } = ctx.body;

  const fullUser = await ctx.options.auth.store.get(ctx.auth.user);

  const isValid = await verify(previous, fullUser.password);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  fullUser.password = await hash(updated);
  await updateUser(fullUser, ctx.auth, ctx.options.auth.store);

  return 200;
}

export default {
  login: emailLogin,
  register: emailRegister,
  reset: emailResetPassword,
  password: emailUpdatePassword,
};
