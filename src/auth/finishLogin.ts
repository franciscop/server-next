import type { AuthSession, AuthUser, Context } from "..";
import { createId } from "../helpers";
import { signJwt } from "../helpers/jwt";
import { loaded } from "../middle/session";
import { cookies, status } from "../reply";
import assertUser from "./assertUser";

type LoginInput = {
  // Provider name stored on the session ("email", "google", ...)
  provider: string;
  // Stable identifier used as the store key and session subject: the mapped
  // user's id for OAuth, or the email for the email provider.
  key: string | number;
  email?: string;
  // The user fields from this login, to reconcile with the stored record
  user: Record<string, any>;
};

// The single place every provider funnels through after authenticating: it
// persists the user, stamps the auth fields on the session, and responds
// according to the chosen strategy. Consolidating it here keeps cookies, the
// session shape, the callbacks, and the strategies consistent across providers.
export default async function finishLogin(ctx: Context, input: LoginInput) {
  const settings = ctx.options.auth;
  const { strategy, onLogin, onUser } = settings;
  const key = String(input.key);

  const auth: AuthSession = {
    user: key,
    provider: input.provider as AuthSession["provider"],
    created: new Date().toISOString().replace(/\.[0-9]*/, ""),
  };

  // Every record knows its own provider and strategy; the stamp wins over any
  // stale values so it always reflects the login actually happening.
  const loginUser = {
    ...input.user,
    provider: input.provider,
    strategy,
  } as AuthUser;
  const existingUser = ((await settings.users.get(key)) ??
    null) as AuthUser | null;

  // `onLogin` owns the record that is persisted (and can deny by throwing);
  // the default is an upsert where the fresh login data wins over the stored
  // fields. It runs before the write, so a denied first login stores nothing.
  const user = onLogin
    ? await onLogin(loginUser, existingUser, ctx)
    : { ...(existingUser ?? {}), ...loginUser };
  assertUser(user, "onLogin");

  await settings.users.set(key, user);

  // `jwt` is stateless: the signed token carries the auth fields and nothing
  // is stored, so the guest session (if any) is left untouched.
  if (strategy.includes("jwt")) {
    const token = await signJwt(auth, ctx.options.secret, 7 * 24 * 60 * 60);
    const exposed = await onUser(user, ctx);
    assertUser(exposed, "onUser");
    return status(201).json({ ...exposed, token });
  }

  // Rotate the session id on login: keeping a guest's id would let an attacker
  // plant one and inherit the session once the victim signs in (fixation).
  // The guest data carries over under the new id.
  const prev = loaded.get(ctx);
  if (prev?.id) await ctx.options.sessions.del(prev.id);
  const id = createId();
  Object.assign(ctx.session, auth);
  // Persist right away, so the credential works the moment the client has it;
  // the fresh snapshot keeps parseResponse from writing the same data again
  await ctx.options.sessions.set(id, ctx.session);
  loaded.set(ctx, { id, data: JSON.stringify(ctx.session) });

  if (strategy.includes("token")) {
    const exposed = await onUser(user, ctx);
    assertUser(exposed, "onUser");
    return status(201).json({ ...exposed, token: id });
  }
  if (strategy.includes("cookie")) {
    return cookies("session", {
      value: id,
      path: "/",
      httpOnly: true,
      secure: ctx.platform.production,
      sameSite: "Lax",
    }).redirect(settings.redirect);
  }
  throw new Error("Unknown auth type");
}
