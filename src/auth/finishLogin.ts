import type { AuthUser, Context } from "..";
import { createId } from "../helpers";
import { signJwt } from "../helpers/jwt";
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
// persists the user + session and responds according to the chosen strategy.
// Consolidating it here keeps cookies, the session shape, the callbacks, and
// the strategies consistent across email/github/google/microsoft/discord/etc.
export default async function finishLogin(ctx: Context, input: LoginInput) {
  const settings = ctx.options.auth;
  const { strategy, onLogin, onUser } = settings;
  const key = String(input.key);

  const auth = {
    id: createId(),
    strategy,
    provider: input.provider,
    user: key,
    email: input.email,
    time: new Date().toISOString().replace(/\.[0-9]*/, ""),
  };

  // Every record knows its own provider and strategy; the stamp wins over any
  // stale values so it always reflects the login actually happening.
  const loginUser = {
    ...input.user,
    provider: input.provider,
    strategy,
  } as AuthUser;
  const existingUser = ((await settings.store.get(key)) ??
    null) as AuthUser | null;

  // `onLogin` owns the record that is persisted (and can deny by throwing);
  // the default is an upsert where the fresh login data wins over the stored
  // fields. It runs before the write, so a denied first login stores nothing.
  const user = onLogin
    ? await onLogin(loginUser, existingUser, ctx)
    : { ...(existingUser ?? {}), ...loginUser };
  assertUser(user, "onLogin");

  await settings.store.set(key, user);
  // `jwt` is stateless (the signed token carries the session), so only the
  // opaque strategies persist the auth record in the session store.
  if (!strategy.includes("jwt")) {
    await settings.session.set(auth.id, auth, { expires: "1w" });
  }

  if (strategy.includes("jwt")) {
    const token = await signJwt(auth, ctx.options.secret, 7 * 24 * 60 * 60);
    const exposed = await onUser(user, ctx);
    assertUser(exposed, "onUser");
    return status(201).json({ ...exposed, token });
  }
  if (strategy.includes("token")) {
    const exposed = await onUser(user, ctx);
    assertUser(exposed, "onUser");
    return status(201).json({ ...exposed, token: auth.id });
  }
  if (strategy.includes("cookie")) {
    return cookies("authentication", {
      value: auth.id,
      path: "/",
      httpOnly: true,
      secure: ctx.platform.production,
      sameSite: "Lax",
    }).redirect(settings.redirect);
  }
  throw new Error("Unknown auth type");
}
