import argon2 from "argon2";

import { createId } from "../helpers/index.js";
import { cookies, status } from "../reply.js";

const registerEmail = async (ctx) => {
  const { type, store, session, cleanUser } = ctx.options.auth;

  const { email, password, ...data } = ctx.body;
  if (!email || !/@/.test(email)) throw new Error("Email needed");
  if (!password || password.length < 8) throw new Error("Password needed");
  if (await store.has(email)) {
    throw new Error("Email is already registered");
  }
  const id = createId();
  const time = new Date().toISOString();
  const pass = await argon2.hash(password);
  await store.set(email, { id, email, password: pass, ...data });

  // The basic user we can send to the public
  const user = cleanUser(ctx.body);

  // TYPE GOES HERE
  const token = createId();
  await session.set(token, {
    id: token,
    type,
    provider: "email",
    user: id,
    email,
    time,
  });
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

const loginEmail = async (ctx) => {
  const { type, store, session, cleanUser } = ctx.options.auth;

  const { email, password } = ctx.body;
  if (!email) throw ServerError.LOGIN_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError.LOGIN_INVALID_EMAIL();
  if (!password) throw ServerError.LOGIN_NO_PASSWORD();
  if (password.length < 8) throw ServerError.LOGIN_INVALID_PASSWORD();

  const time = new Date().toISOString();
  const fullUser = await store.get(email);
  if (!fullUser) throw ServerError.LOGIN_WRONG_EMAIL();
  const isValid = await argon2.verify(fullUser.password, password);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  // The basic user we can send to the public
  const user = cleanUser(fullUser);

  // TYPE GOES HERE
  const token = createId();
  await session.set(token, {
    id: token,
    type,
    provider: "email",
    user: user.id,
    email,
    time,
  });
  if (type === "token") {
    return { ...user, token };
  } else if (type === "cookie") {
    return cookies({ authorization: token }).send(user);
  } else if (type === "jwt") {
    throw new Error("JWT auth not supported yet");
  } else if (type === "key") {
    throw new Error("Key auth not supported yet");
  } else {
    throw new Error("Unknown auth type");
  }
};

const logout = async (ctx) => {
  const { id, type } = ctx.auth;
  await ctx.options.session.store.del(id);
  if (type === "token") {
    return { token: null };
  } else if (type === "cookie") {
    return cookies({ authorization: null }).send({});
  } else if (type === "jwt") {
    throw new Error("JWT auth not supported yet");
  } else if (type === "key") {
    throw new Error("Key auth not supported yet");
  } else {
    throw new Error("Unknown auth type");
  }
};

export default { registerEmail, loginEmail, logout };
