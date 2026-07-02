import server, { Context, Provider, redirect } from "@server/next";
import kv from "polystore";
import { AccountPage, LoginPage } from "./App";

const store = kv(new Map());

// Every provider this demo supports, in display order
const ALL: Provider[] = [
  "github",
  "google",
  "microsoft",
  "discord",
  "facebook",
  "apple",
];

// Enable each provider that has credentials in .env, so the demo boots even if
// you only configured a few of them (each enabled one then gets a button).
const providers = ALL.filter((p) => process.env[`${p.toUpperCase()}_ID`]);

const auth = providers.length
  ? { strategy: "cookie" as const, providers, redirect: "/" }
  : undefined;

const requireUser = (ctx: Context) => {
  if (!ctx.user) return redirect("/login");
};

export default server({ public: "public", store, auth })
  .head("/", () => 200)
  .get("/login", () => <LoginPage providers={providers} />)
  .get("/", requireUser, (ctx) => <AccountPage user={ctx.user} />);
