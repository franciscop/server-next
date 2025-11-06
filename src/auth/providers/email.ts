import { createId } from "../../helpers/index.js";
import { ServerError, status } from "../../index.js";
import updateUser from "../updateUser.js";
import type { Context } from "../../types.js";

const hash = new Proxy(
  {} as any,
  {
    get: (self: any, key: string) => {
      const load = async () =>
        Object.assign(
          self,
          await import("argon2").catch(() => {
            throw new ServerError.AUTH_ARGON_NEEDED();
          }),
        );
      if (key === "verify" && !self.verify) {
        return async (hash: string, pass: string) => {
          await load();
          return self.verify(hash, pass);
        };
      }
      if (key === "hash" && !self.hash) {
        return async (pass: string) => {
          await load();
          return self.hash(pass);
        };
      }
      return self[key];
    },
  },
);

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

  if (type === "token") {
    return status(201).json({ ...user, token: id });
  }
  if (type === "cookie") {
    return status(302).cookies({ authentication: id }).redirect(redirect);
  }
  if (type === "jwt") {
    throw new Error("JWT auth not supported yet");
  }
  if (type === "key") {
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
  const isValid = await hash.verify(user.password, password);
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
    password: await hash.hash(password),
    time,
    ...data,
  };
  await store.set(email, user);

  return createSession(user, ctx);
}

async function emailResetPassword(ctx: Context) {
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

  const isValid = await hash.verify(fullUser.password, previous);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  fullUser.password = await hash.hash(updated);
  await updateUser(fullUser, ctx.auth, ctx.options.auth.store);

  return 200;
}

export default {
  login: emailLogin,
  register: emailRegister,
  reset: emailResetPassword,
  password: emailUpdatePassword,
};
