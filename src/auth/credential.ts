import { clearOnSend } from "../http/createCookies";
import { parse } from "../util/duration";
import { decodeJwt, signJwt, verifyJwt } from "./jwt";
import ServerError from "../errors";
import type {
  AuthConfig,
  AuthMeta,
  AuthProfile,
  Context,
  Cookie,
  Strategy,
} from "../types";

export const NAME = "session";

// Two axes, four names: where the credential rides, and what it holds. An
// opaque id needs somewhere to be looked up; signed data needs nowhere.
export const inCookie = (s: Strategy) => s === "session" || s === "cookie";
const isSigned = (s: Strategy) => s === "cookie" || s === "jwt";

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
const looksLikeOurs = (token: string): boolean =>
  decodeJwt(token)?.header?.alg === "HS256";

// The shape every auth cookie shares; only the value and lifetime differ.
export const authCookie = (
  ctx: Context,
  value: string,
  expires: string,
): Cookie => ({
  value,
  path: "/",
  expires,
  httpOnly: true,
  secure: ctx.platform.production,
  sameSite: "Lax",
});

export const bearer = (ctx: Context): string | undefined => {
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
    clearOnSend(ctx, NAME);
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

// Boot-time checks, so a bad combination fails at server() rather than at the
// first login. Callbacks are all or nothing: with none, there is no database,
// so the profile itself is signed and only the signed strategies can work.
export function validate(
  strategy: Strategy,
  expires: string,
  config: AuthConfig,
): void {
  if (!["session", "cookie", "token", "jwt"].includes(strategy)) {
    throw new Error(
      `Unknown strategy "${strategy}"; it takes 'session', 'cookie', 'token' or 'jwt'.`,
    );
  }
  seconds(expires); // a bad duration is a config error, so it fails at boot

  const { onLogin, getUser, toPublicUser } = config;
  if (onLogin && !getUser) {
    throw new Error("`onLogin` needs a `getUser`: something has to resolve the id it returns.");
  }
  if (isSigned(strategy)) {
    if (getUser && !toPublicUser) {
      throw new Error(
        `The \`${strategy}\` strategy signs the user into the credential, so it ` +
          "needs a `toPublicUser` to say what goes in. Signing the whole row " +
          "would publish whatever else is on it.",
      );
    }
  } else if (!getUser) {
    throw new Error(
      `The \`${strategy}\` strategy puts an id in the credential, so it needs a ` +
        "`getUser` to resolve it. With no database, use `cookie` or `jwt`.",
    );
  }
}

// The default toPublicUser: what gets signed is held and readable by the
// client, so the access token and the raw payload never leave the server,
// and `provider` rides in the credential itself for ctx.auth instead.
const publicProfile = ({ id, email, name, avatar }: AuthProfile) => ({
  id,
  email,
  name,
  avatar,
});

// What the credential carries. With callbacks it is the app's id, or (for
// the signed strategies) the public user that id resolves to; with none,
// there is no database and the profile itself is what gets signed.
export async function credentialPayload(
  config: AuthConfig,
  strategy: Strategy,
  ctx: Context,
  profile: AuthProfile,
) {
  const { onLogin, getUser, toPublicUser } = config;
  if (!getUser) return { user: publicProfile(profile) };
  let id: string | number | undefined;
  try {
    id = await onLogin!(profile, ctx);
  } catch (error) {
    // A refusal, and its message is meant for the person reading it
    (error as any).expose = true;
    throw error;
  }
  if (id === undefined || id === null) {
    throw new Error("`onLogin` must return the id the credential points at");
  }
  if (!isSigned(strategy)) return { sub: String(id) };
  const user = await getUser(String(id), ctx);
  if (user === undefined || user === null) {
    // Signing an empty credential would look like a successful login
    // that leaves them anonymous everywhere
    throw new Error(`getUser returned nothing for the id "${id}" that onLogin just returned`);
  }
  return { user: await toPublicUser!(user) };
}

