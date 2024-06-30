import { ServerError } from "../index.js";

const validateToken = (authorization) => {
  const [type, id] = authorization.trim().split(" ");
  if (type.toLowerCase() !== "bearer") {
    throw ServerError.AUTH_INVALID_TYPE({ type });
  }
  if (id.length !== 24) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return id;
};

const validateCookie = (authorization) => {
  if (authorization.length !== 24) {
    throw ServerError.AUTH_INVALID_COOKIE();
  }
  return authorization;
};

export default async function findAuth(ctx) {
  // NO AUTH AT ALL; nothing to do
  if (!ctx.options.auth) return;

  const { type, store, session, cleanUser } = ctx.options.auth;

  if (type === "token") {
    // If the user is not authenticated, there's no auth to retrieve
    if (!ctx.headers.authorization) return;

    // Check the authentication header
    ctx.auth = await session.get(validateToken(ctx.headers.authorization));
  } else if (type === "cookie") {
    // If the user is not authenticated, there's no auth to retrieve
    if (!ctx.cookies.authorization) return;

    ctx.auth = await session.get(validateCookie(ctx.cookies.authorization));
  } else {
    // NO VALID AUTH; RETURN
    throw new Error("Invalid auth type " + type);
  }

  if (!ctx.auth) throw new Error("Credentials do not correspond to a user");
  if (ctx.auth.provider === "email") {
    ctx.user = cleanUser(await store.get(ctx.auth.email));
  }
}
