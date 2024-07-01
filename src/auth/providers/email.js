import argon2 from "argon2";

import { createId } from "../../helpers/index.js";
import { ServerError, status } from "../../index.js";

const createSession = async (user, ctx) => {
  const { type, session, cleanUser } = ctx.options.auth;
  user = cleanUser(user);
  const token = createId();
  const provider = "email";
  const time = new Date().toISOString().replace(/\.[0-9]*/, "");
  ctx.auth = {
    id: token,
    type,
    provider,
    user: user.id,
    email: user.email,
    time,
  };
  await session.set(token, ctx.auth, { expires: "1w" });

  if (type === "token") {
    return status(201).json({ ...user, token });
  } else if (type === "cookie") {
    return status(201).cookies({ authorization: token }).send(user);
  } else if (type === "jwt") {
    throw new Error("JWT auth not supported yet");
  } else if (type === "key") {
    throw new Error("Key auth not supported yet");
  } else {
    throw new Error("Unknown auth type");
  }
};

async function login(ctx) {
  const { email, password } = ctx.body;
  if (!email) throw ServerError.LOGIN_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.LOGIN_INVALID_EMAIL();
  if (!password) throw ServerError.LOGIN_NO_PASSWORD();
  if (password.length < 8) throw ServerError.LOGIN_INVALID_PASSWORD();

  const store = ctx.options.auth.store;
  if (!(await store.has(email))) throw ServerError.LOGIN_WRONG_EMAIL();

  const user = await store.get(email);
  const isValid = await argon2.verify(user.password, password);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  return createSession(user, ctx);
}

async function register(ctx) {
  const { email, password, ...data } = ctx.body;
  if (!email) throw ServerError.REGISTER_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.REGISTER_INVALID_EMAIL();
  if (!password) throw ServerError.REGISTER_NO_PASSWORD();
  if (password.length < 8) throw ServerError.REGISTER_INVALID_PASSWORD();

  const store = ctx.options.auth.store;
  if (await store.has(email)) throw ServerError.REGISTER_EMAIL_EXISTS();

  const user = {
    id: createId(),
    email,
    password: await argon2.hash(password),
    ...data,
  };
  await store.set(email, user);

  return createSession(user, ctx);
}

export default { login, register };
