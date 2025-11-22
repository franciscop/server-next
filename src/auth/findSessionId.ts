import ServerError from "../ServerError";
import type { Context } from "../types";

const validateToken = (authorization: string): string => {
  const [type, id] = authorization.trim().split(" ");
  if (type.toLowerCase() !== "bearer") {
    throw ServerError.AUTH_INVALID_HEADER({ type });
  }
  if (id.length !== 16) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return id;
};

const validateCookie = (authorization: string): string => {
  if (authorization.length !== 16) {
    throw ServerError.AUTH_INVALID_COOKIE();
  }
  return authorization;
};

export default function findSessionId(ctx: Context): string | undefined {
  const strategy = ctx.options.auth.strategy;

  if (!strategy) throw new Error(`Invalid strategy "${strategy}"`);
  if (strategy.includes("token")) {
    // If the user is not authenticated, there's no auth to retrieve
    if (!ctx.headers.authorization) return;

    // Check the authentication header
    return validateToken(ctx.headers.authorization as string);
  }

  if (strategy.includes("cookie")) {
    // If the user is not authenticated, there's no auth to retrieve
    if (!ctx.cookies.authentication) return;

    return validateCookie(ctx.cookies.authentication);
  }

  throw new Error(`Invalid auth type "${strategy}"`);
}
