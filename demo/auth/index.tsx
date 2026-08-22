import server, { Context, redirect } from "@server/next";
import { AccountPage, LoginPage } from "./App";

// Every provider this demo supports, in display order. All but GitHub speak
// OIDC, so a name is the whole integration.
const ALL = ["github", "google", "microsoft", "discord", "slack", "twitch"];

// Enable each provider that has credentials in .env, so the demo boots even if
// you only configured a few of them (each enabled one then gets a button).
const providers = ALL.filter((p) => process.env[`${p.toUpperCase()}_ID`]);

// No callbacks, so no database: the profile is signed into the cookie, which
// is all this demo needs. Add `onLogin`/`getUser` to keep your own rows.
const auth = providers.length
  ? { strategy: "cookie" as const, providers, redirect: "/" }
  : undefined;

const requireUser = (ctx: Context) => {
  if (!ctx.user) return redirect("/login");
};

export default server({ public: "public", auth })
  .head("/", () => 200)
  .get("/login", () => <LoginPage providers={providers} />)
  .get("/", requireUser, (ctx) => <AccountPage user={ctx.user} />);
