import type { Context } from "..";
import { createId } from "../helpers";
import { signJwt } from "../helpers/jwt";
import { cookies, status } from "../reply";

type LoginInput = {
  // Provider name stored on the session ("email", "google", ...)
  provider: string;
  // Stable identifier used as the store key and session subject: a provider's
  // user id for OAuth, or the email for the email provider.
  key: string | number;
  email?: string;
  // The user fields to persist/return. For an upsert (the default) they are
  // merged over the existing record before cleaning.
  user: Record<string, any>;
  // Whether to write the user to the store. OAuth providers upsert; the email
  // provider stores at registration and passes `false` so a later login doesn't
  // overwrite the record with a password-stripped version.
  store?: boolean;
};

// The single place every provider funnels through after authenticating: it
// persists the user + session and responds according to the chosen strategy.
// Consolidating it here keeps cookies, the session shape, and (soon) extra
// strategies consistent across email/github/google/microsoft/discord/etc.
export default async function finishLogin(ctx: Context, input: LoginInput) {
  const settings = ctx.options.auth;
  const { strategy, cleanUser } = settings;
  const key = String(input.key);

  const auth = {
    id: createId(),
    strategy,
    provider: input.provider,
    user: key,
    email: input.email,
    time: new Date().toISOString().replace(/\.[0-9]*/, ""),
  };

  let user = input.user;
  if (input.store !== false) {
    const existing = await settings.store.get(key);
    user = { ...((existing as object) ?? {}), ...input.user };
  }
  user = await cleanUser(user);

  if (input.store !== false) await settings.store.set(key, user);
  // `jwt` is stateless (the signed token carries the session), so only the
  // opaque strategies persist the auth record in the session store.
  if (!strategy.includes("jwt")) {
    await settings.session.set(auth.id, auth, { expires: "1w" });
  }

  if (strategy.includes("jwt")) {
    const token = await signJwt(auth, ctx.options.secret, 7 * 24 * 60 * 60);
    return status(201).json({ ...user, token });
  }
  if (strategy.includes("token")) {
    return status(201).json({ ...user, token: auth.id });
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
  if (strategy.includes("key")) throw new Error("Key auth not supported yet");
  throw new Error("Unknown auth type");
}
