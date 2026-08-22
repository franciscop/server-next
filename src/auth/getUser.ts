import type { AuthSession, AuthUser, Context } from "..";
import { ServerError } from "..";
import { verifyJwt } from "../helpers/jwt";
import assertUser from "./assertUser";
import findSessionId from "./findSessionId";

// `jwt` carries the user itself as signed claims: verify the signature and
// the claims become ctx.user (through onUser), with no store reads at all.
async function getJwtUser(ctx: Context): Promise<AuthUser | undefined> {
  const header = ctx.headers.authorization as string | undefined;
  if (!header) return;
  const [type, token] = header.trim().split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    throw ServerError.AUTH_INVALID_HEADER({ type });
  }
  const payload = await verifyJwt(token, ctx.options.secrets);
  if (!payload) throw ServerError.AUTH_INVALID_TOKEN();

  const { iat, exp, ...claims } = payload as Record<string, any>;
  // Tokens from other payload shapes (or pre-claims versions) are invalid
  if (!claims.id || !claims.email) throw ServerError.AUTH_INVALID_TOKEN();
  if (!ctx.options.auth.providers.includes(claims.provider)) {
    throw ServerError.AUTH_INVALID_PROVIDER({
      provider: claims.provider,
      valid: ctx.options.auth.providers,
    });
  }

  const exposed = await ctx.options.auth.onUser(claims as AuthUser, ctx);
  assertUser(exposed, "onUser");
  return exposed;
}

// The other strategies read the login record the credential points at
async function getAuthSession(ctx: Context): Promise<AuthSession | undefined> {
  const id = findSessionId(ctx);
  if (!id) return;
  const session = await ctx.options.auth.sessions.get<AuthSession>(id);
  return session?.user ? session : undefined;
}

export default async function getUser(ctx: Context): Promise<AuthUser> {
  if (!ctx.options.auth) return; // NO AUTH AT ALL; nothing to do here
  const options = ctx.options.auth;

  if (options.strategy.includes("jwt")) return getJwtUser(ctx);

  const auth = await getAuthSession(ctx);
  if (!auth) return; // NO LOGIN FOUND; no auth
  // Logins outlive config changes: one made through a provider that was since
  // removed is no longer valid
  if (!options.providers.includes(auth.provider)) {
    throw ServerError.AUTH_INVALID_PROVIDER({
      provider: auth.provider,
      valid: options.providers,
    });
  }

  const user = await options.users.get<AuthUser>(auth.user);
  if (!user) throw ServerError.AUTH_NO_USER();

  // `onUser` shapes what handlers see; the default strips `password`
  const exposed = await options.onUser(user, ctx);
  assertUser(exposed, "onUser");
  return exposed;
}
