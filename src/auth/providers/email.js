import { createId } from "../../helpers/index.js";
import { ServerError, status } from "../../index.js";
import findUser from "../findUser.js";
import updateUser from "../updateUser.js";

const hash = new Proxy(
  {},
  {
    get: (self, key) => {
      const load = async () =>
        Object.assign(
          self,
          await import("argon2").catch(() => {
            throw new ServerError.AUTH_ARGON_NEEDED();
          })
        );
      if (key === "verify" && !self.verify) {
        return async (hash, pass) => {
          await load();
          return self.verify(hash, pass);
        };
      }
      if (key === "hash" && !self.hash) {
        return async (pass) => {
          await load();
          return self.hash(pass);
        };
      }
      return self[key];
    },
  }
);

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
  const isValid = await hash.verify(user.password, password);
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
    password: await hash.hash(password),
    ...data,
  };
  await store.set(email, user);

  return createSession(user, ctx);
}

async function reset(ctx) {
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

async function password(ctx) {
  const { previous, updated } = ctx.body;

  const fullUser = await findUser(ctx.auth, ctx.options.auth.store);

  const isValid = await hash.verify(fullUser.password, previous);
  if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

  fullUser.password = await hash.hash(updated);
  await updateUser(fullUser, ctx.auth, ctx.options.auth.store);

  return 200;
}

export default { login, register, reset, password };
