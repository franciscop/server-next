import { ServerError } from "../index.js";

const validateToken = (authorization) => {
  const [type, id] = authorization.trim().split(" ");
  if (type.toLowerCase() !== "bearer") {
    throw ServerError.AUTH_INVALID_TYPE({ type });
  }
  if (id.length !== 16) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return id;
};

const validateCookie = (authorization) => {
  if (authorization.length !== 16) {
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
    if (!ctx.cookies.authentication) return;

    return validateCookie(ctx.cookies.authentication);
  }

  throw new Error(`Invalid auth type "${type}"`);
};

export default async function auth(ctx) {
  if (!ctx.options.auth) return; // NO AUTH AT ALL; nothing to do here
  const options = ctx.options.auth;

  const sessionId = findSessionId(ctx);
  if (!sessionId) return; // NO SESSION FOUND; no auth

  const auth = await options.session.get(sessionId);
  // Mmh, which one to do...
  if (!auth) throw ServerError.AUTH_NO_SESSION();
  // if (!auth) return; // SESSION ALREADY INVALID; no auth

  if (!auth.provider) throw ServerError.AUTH_NO_PROVIDER();
  if (!options.provider.includes(auth.provider)) {
    const valid = JSON.stringify(options.provider);
    throw ServerError.AUTH_INVALID_PROVIDER({ provider: auth.provider, valid });
  }
  return auth;
}
