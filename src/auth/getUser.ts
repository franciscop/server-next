import type { AuthSession, AuthUser, Context } from "..";
import { ServerError } from "..";
import findSessionId from "./findSessionId";

export default async function getUser(ctx: Context): Promise<AuthUser> {
  if (!ctx.options.auth) return; // NO AUTH AT ALL; nothing to do here
  const options = ctx.options.auth;

  const sessionId = findSessionId(ctx);
  if (!sessionId) return; // NO SESSION FOUND; no auth

  const auth = await options.session.get<AuthSession>(sessionId);
  // Mmh, which one to do...
  if (!auth) return;
  if (options.strategy !== auth.strategy) {
    throw ServerError.AUTH_INVALID_STRATEGY({
      strategy: auth.strategy || "undefined",
      valid: options.strategy,
    });
  }
  if (!options.provider.includes(auth.provider)) {
    throw ServerError.AUTH_INVALID_PROVIDER({
      provider: auth.provider,
      valid: options.provider,
    });
  }
  // if (!auth) throw ServerError.AUTH_NO_SESSION();

  const user = await ctx.options.auth.store.get<AuthUser>(auth.user);
  if (!user) throw ServerError.AUTH_NO_USER();
  user.strategy = auth.strategy;
  user.provider = auth.provider;

  return ctx.options.auth.cleanUser(user);
}
