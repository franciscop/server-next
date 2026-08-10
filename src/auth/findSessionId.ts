import ServerError from "../ServerError";
import type { Context } from "../types";

const validateToken = (authorization: string): string => {
  const [type, id] = authorization.trim().split(" ");
  if (type?.toLowerCase() !== "bearer") {
    throw ServerError.AUTH_INVALID_HEADER({ type });
  }
  if (id?.length !== 16) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return id;
};

// The session id for this request. The `token` strategy is bearer-only, so an
// API client never gets cookies; every other case reads the `session` cookie,
// which carries both guest sessions and the `cookie` strategy's login.
export default function findSessionId(ctx: Context): string | undefined {
  if (ctx.options.auth?.strategy.includes("token")) {
    if (!ctx.headers.authorization) return; // a guest: no carrier, no session
    return validateToken(ctx.headers.authorization as string);
  }
  return ctx.cookies.session || undefined;
}
