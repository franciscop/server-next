import type { AuthSession, AuthUser, Context } from "..";
import { ServerError } from "..";
import { verifyJwt } from "../helpers/jwt";
import safeEqual from "../helpers/safeEqual";
import findSessionId from "./findSessionId";

// `key` auth: a single shared secret sent as `Authorization: Bearer <key>`.
// There's no user, so a match just yields a fixed "authenticated" marker.
function getKeyUser(ctx: Context): AuthUser | undefined {
  const expected = ctx.options.auth.key;
  const header = ctx.headers.authorization as string | undefined;
  if (!header) return; // no key sent -> anonymous
  const [type, provided] = header.trim().split(" ");
  if (type?.toLowerCase() !== "bearer" || !provided) {
    throw ServerError.AUTH_INVALID_HEADER({ type });
  }
  if (!expected || !safeEqual(provided, expected)) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return { id: "key", strategy: "key", provider: "key" } as unknown as AuthUser;
}

// Resolve the auth session record for the request. The `jwt` strategy carries it
// inside a signed Bearer token (stateless); the others store an opaque id.
async function getAuthSession(ctx: Context): Promise<AuthSession | undefined> {
  const strategy = ctx.options.auth.strategy;

  if (strategy.includes("jwt")) {
    const header = ctx.headers.authorization as string | undefined;
    if (!header) return;
    const [type, token] = header.trim().split(" ");
    if (type?.toLowerCase() !== "bearer" || !token) {
      throw ServerError.AUTH_INVALID_HEADER({ type });
    }
    const payload = await verifyJwt(token, ctx.options.secret);
    if (!payload) throw ServerError.AUTH_INVALID_TOKEN();
    return payload as AuthSession;
  }

  const id = findSessionId(ctx);
  if (!id) return;
  return ctx.options.auth.session.get<AuthSession>(id);
}

export default async function getUser(ctx: Context): Promise<AuthUser> {
  if (!ctx.options.auth) return; // NO AUTH AT ALL; nothing to do here
  const options = ctx.options.auth;

  // Shared-secret auth is a simple key check, with no users/store/session.
  if (options.strategy === "key") return getKeyUser(ctx);

  const auth = await getAuthSession(ctx);
  if (!auth) return; // NO SESSION FOUND; no auth
  if (options.strategy !== auth.strategy) {
    throw ServerError.AUTH_INVALID_STRATEGY({
      strategy: auth.strategy || "undefined",
      valid: options.strategy,
    });
  }
  if (!options.providers.includes(auth.provider)) {
    throw ServerError.AUTH_INVALID_PROVIDER({
      provider: auth.provider,
      valid: options.providers,
    });
  }
  // if (!auth) throw ServerError.AUTH_NO_SESSION();

  const user = await ctx.options.auth.store.get<AuthUser>(auth.user);
  if (!user) throw ServerError.AUTH_NO_USER();
  user.strategy = auth.strategy;
  user.provider = auth.provider;

  return ctx.options.auth.cleanUser(user);
}
