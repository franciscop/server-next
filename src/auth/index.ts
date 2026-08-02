import type { Context, Provider, Server } from "..";
import getUser from "./getUser";
import logout from "./logout";
import providers from "./providers";

// Standard OAuth2 providers: each needs <NAME>_ID + <NAME>_SECRET env vars and
// exposes the same GET /auth/login/<name> + GET /auth/callback/<name> routes.
const oauth: Provider[] = [
  "github",
  "google",
  "microsoft",
  "discord",
  "facebook",
];

export default function auth(app: Server) {
  // Load the user from the middleware directly
  app.use(async function middle(ctx: Context) {
    ctx.user = await getUser(ctx);
  });

  // One logout route for every provider and strategy. POST, since it changes
  // state (clearing the session) and so shouldn't be triggered by a prefetch.
  app.post("/auth/logout", logout);

  const enabled = app.settings.auth.providers;

  for (const name of oauth) {
    if (!enabled.includes(name)) continue;
    const key = name.toUpperCase();
    if (!env[`${key}_ID`]) throw new Error(`${key}_ID not defined`);
    if (!env[`${key}_SECRET`]) throw new Error(`${key}_SECRET not defined`);
    app.get(`/auth/login/${name}`, providers[name].login);
    app.get(`/auth/callback/${name}`, providers[name].callback);
  }

  // Apple uses a signed-JWT client secret and POSTs the result back (form_post)
  if (enabled.includes("apple")) {
    const keys = ["APPLE_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"];
    for (const key of keys) {
      if (!env[key]) throw new Error(`${key} not defined`);
    }
    app.get("/auth/login/apple", providers.apple.login);
    app.post("/auth/callback/apple", providers.apple.callback);
  }

  if (enabled.includes("email")) {
    app.post("/auth/register/email", providers.email.register);
    app.post("/auth/login/email", providers.email.login);
    app.put("/auth/password/email", providers.email.password);
    app.put("/auth/reset/email", providers.email.reset);
  }
}
