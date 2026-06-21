import type { Context } from "..";
import { createId } from "../helpers";
import createCookies from "../helpers/createCookies";
import ServerError from "../ServerError";
import type { Cookie } from "../types";

const NAME = "oauth_state";

// Creates a CSRF `state` token bound to the user's browser via a short-lived
// HttpOnly cookie, returned alongside the cookie to set. The provider echoes
// the token back on the callback, where it must match the cookie.
//
// Apple's callback is a cross-site POST, so its state cookie needs
// `SameSite=None` (which requires `Secure`, i.e. HTTPS — which Apple uses).
export function startState(
  ctx: Context,
  crossSite = false,
): { state: string; cookie: Cookie } {
  const state = createId();
  return {
    state,
    cookie: {
      value: state,
      path: "/",
      expires: "10m",
      httpOnly: true,
      secure: crossSite || ctx.platform.production,
      sameSite: crossSite ? "None" : "Lax",
    },
  };
}

// Reject the callback unless the echoed state matches the browser's cookie
export function checkState(ctx: Context, received?: string): void {
  const expected = ctx.cookies[NAME];
  if (!expected || !received || expected !== received) {
    throw ServerError.AUTH_INVALID_STATE();
  }
}

// One-time use: clear the cookie once the callback has consumed the state
export function clearState(): string {
  return createCookies(NAME, { value: null });
}
