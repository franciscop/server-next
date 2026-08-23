import { parse } from "../helpers/createCookies";
import { signJwt, verifyJwt } from "../helpers/jwt";
import ServerError from "../ServerError";
import type { AuthMeta, Context, Strategy } from "../types";

export const NAME = "session";

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

// The same parser cookies use, so '30d', '12 hours' and '1y' all work
export function seconds(expires: string): number {
  const ms = parse(expires);
  if (!ms) throw new Error(`Invalid \`expires\`: "${expires}"`);
  return Math.round(ms / 1000);
}

// Whether a token even claims to be one of ours, without verifying it: three
// parts and an HS256 header. Structure only, so nothing attacker-controlled is
// read out of it.
const looksLikeOurs = (token: string): boolean => {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    return header?.alg === "HS256";
  } catch {
    return false;
  }
};

const bearer = (ctx: Context): string | undefined => {
  const header = ctx.headers.authorization as string | undefined;
  if (!header) return;
  const [type, token] = header.trim().split(" ");
  // Another scheme (Basic, a proxy's) is not ours to police: no credential
  if (type?.toLowerCase() !== "bearer") return;
  // `Bearer` with nothing after it is a client that meant to send one
  if (!token) throw ServerError.AUTH_INVALID_HEADER({ type });
  return token;
};

// Read the strategy's carrier. A missing credential is anonymous. A broken
// one splits by carrier: cookies arrive ambiently (stale, another app on
// localhost, an expired login), so a bad cookie is just signed out; a bearer
// token was attached deliberately, so a bad one is a 401 the client must see.
export async function read(
  ctx: Context,
  strategy: Strategy,
): Promise<Payload | undefined> {
  const token = inCookie(strategy) ? ctx.cookies[NAME] : bearer(ctx);
  if (!token) return;
  const payload = await verifyJwt(token, ctx.options.secrets);
  if (!payload) {
    if (!inCookie(strategy)) throw ServerError.AUTH_INVALID_TOKEN();
    // Nothing can ever make this cookie verify again (a rotated secret, an
    // upgrade, another app on the same host), so clear it instead of failing
    // the same way on every future request.
    (ctx as any).clearCookie = NAME;
    // One of these has a fix, and it is the one worth naming. Never log the
    // token or its claims: unverified, they are attacker-controlled.
    ctx.options.log?.message(
      "auth",
      looksLikeOurs(token)
        ? "discarded a session cookie signed with a key that is not in " +
            "SECRETS. If you rotated it, keep the previous value: " +
            "secrets: [current, previous]"
        : "discarded a session cookie that was not issued by this app",
    );
    return;
  }
  return payload as Payload;
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

