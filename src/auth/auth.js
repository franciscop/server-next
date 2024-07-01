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

const findSessionId = (ctx) => {
  const type = ctx.options.auth.type;

  if (type === "token") {
    // If the user is not authenticated, there's no auth to retrieve
    if (!ctx.headers.authorization) return;

    // Check the authentication header
    return validateToken(ctx.headers.authorization);
  }

  if (type === "cookie") {
    // If the user is not authenticated, there's no auth to retrieve
    if (!ctx.cookies.authorization) return;

    return validateCookie(ctx.cookies.authorization);
  }

  throw new Error("Invalid auth type " + type);
};

export default async function findAuth(ctx) {
  if (!ctx.options.auth) return; // NO AUTH AT ALL; nothing to do here
  const options = ctx.options.auth;

  const sessionId = findSessionId(ctx);
  if (!sessionId) return; // NO SESSION FOUND; no auth

  const auth = await options.session.get(sessionId);
  if (!auth) throw ServerError.AUTH_NO_SESSION();
  return auth;
}
