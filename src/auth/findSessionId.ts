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

// The session id for this request: an explicit Bearer credential wins (the
// `token` strategy; malformed ones throw), then the plain `session` cookie,
// which carries both guest sessions and the `cookie` strategy's login.
export default function findSessionId(ctx: Context): string | undefined {
  const strategy = ctx.options.auth?.strategy;
  if (strategy?.includes("token") && ctx.headers.authorization) {
    return validateToken(ctx.headers.authorization as string);
  }
  return ctx.cookies.session || undefined;
}
