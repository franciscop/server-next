import { signJwt, verifyJwt } from "../helpers/jwt";
import ServerError from "../ServerError";
import type { Context } from "..";
import type { Cookie } from "../types";

const NAME = "oauth_state";
const EXPIRES = "10m";

// What has to survive the redirect: the CSRF `state` the provider echoes back,
// and the payload it must not see (a PKCE `codeVerifier`, resolved scopes).
export type Pending = { state: string; payload?: Record<string, any> };

// Bound to the browser through a short-lived HttpOnly cookie, and signed:
// a forged `codeVerifier` would defeat PKCE, so this is closer to a secret
// than a bare state token is.
export async function startState(
  ctx: Context,
  pending: Pending,
): Promise<Cookie> {
  const value = await signJwt(pending, ctx.options.secrets[0], 10 * 60);
  return {
    value,
    path: "/",
    expires: EXPIRES,
    httpOnly: true,
    secure: ctx.platform.production,
    sameSite: "Lax",
  };
}

// Reject the callback unless the echoed state matches the browser's cookie
export async function readState(
  ctx: Context,
  received?: string,
): Promise<Pending> {
  const cookie = ctx.cookies[NAME];
  if (!cookie || !received) throw ServerError.AUTH_INVALID_STATE();
  const pending = (await verifyJwt(cookie, ctx.options.secrets)) as Pending;
  if (!pending || pending.state !== received) {
    throw ServerError.AUTH_INVALID_STATE();
  }
  return pending;
}

export { NAME as STATE_COOKIE };
