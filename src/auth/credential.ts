import { signJwt, verifyJwt } from "../helpers/jwt";
import ServerError from "../ServerError";
import type { AuthMeta, Context, Strategy } from "../types";

const NAME = "session";

// Two axes, four names: where the credential rides, and what it holds. An
// opaque id needs somewhere to be looked up; signed data needs nowhere.
export const inCookie = (s: Strategy) => s === "session" || s === "cookie";
export const isSigned = (s: Strategy) => s === "cookie" || s === "jwt";

// `sub` is the id `getUser` resolves; `user` is the whole record, already
// shaped by `toPublicUser`, for the strategies that carry it
export type Payload = {
  sub?: string;
  user?: any;
  // Signed in so a request can tell which provider it came from
  provider?: string;
  // Stamped by `signJwt` on every credential we issue
  iat: number;
  exp?: number;
};

const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

export function seconds(expires: string): number {
  const match = /^(\d+)([smhdw])$/.exec(expires);
  if (!match) throw new Error(`Invalid \`expires\`: "${expires}"`);
  return Number(match[1]) * UNITS[match[2]];
}

const bearer = (ctx: Context): string | undefined => {
  const header = ctx.headers.authorization as string | undefined;
  if (!header) return;
  const [type, token] = header.trim().split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    throw ServerError.AUTH_INVALID_HEADER({ type });
  }
  return token;
};

// Read whichever carrier this app accepts. A missing credential is anonymous;
// a present but unverifiable one is a 401, since silently treating an expired
// token as "not logged in" sends clients hunting in the wrong place.
export async function read(
  ctx: Context,
  strategies: Strategy[],
): Promise<{ payload: Payload; strategy: Strategy } | undefined> {
  for (const strategy of strategies) {
    const token = inCookie(strategy) ? ctx.cookies[NAME] : bearer(ctx);
    if (!token) continue;
    const payload = await verifyJwt(token, ctx.options.secrets);
    if (!payload) throw ServerError.AUTH_INVALID_TOKEN();
    // Which one matched matters: an app accepting both a cookie and a bearer
    // token cannot otherwise tell how this request authenticated
    return { payload: payload as Payload, strategy };
  }
}

// The credential's own claims, as `ctx.auth`
export const meta = (payload: Payload, strategy?: Strategy): AuthMeta => ({
  issuedAt: new Date(payload.iat * 1000),
  expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
  strategy,
  provider: payload.provider,
});

export const issue = (
  ctx: Context,
  payload: Omit<Payload, "iat" | "exp">,
  expires: string,
) =>
  signJwt(payload, ctx.options.secrets[0], seconds(expires));

