import server, { Context, Provider, redirect } from "@server/next";
import kv from "polystore";

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
const provider = ALL.filter((p) =>
  p === "apple" ? process.env.APPLE_ID : process.env[`${p.toUpperCase()}_ID`],
);

const auth = provider.length
  ? { strategy: "cookie" as const, provider, redirect: "/" }
  : undefined;

const requireUser = (ctx: Context) => {
  if (!ctx.user) return redirect("/login");
};

const label = (p: string) => p[0].toUpperCase() + p.slice(1);

export default server({ public: "public", store, auth })
  .head("/", () => 200)
  .get("/login", () => (
    <div>
      <h1>Login Demo</h1>
      {provider.length === 0 && (
        <p>No providers configured. Add credentials to .env (see .env.template).</p>
      )}
      {provider.map((p) => (
        <p>
          <a href={`/auth/login/${p}`}>Login with {label(p)}</a>
        </p>
      ))}
    </div>
  ))
  .get("/", requireUser, async (ctx) => (
    <div>
      <h1>Welcome {ctx.user.name}</h1>
      <pre>{JSON.stringify(ctx.user, null, 2)}</pre>
      <a href="/auth/logout">Logout</a>
    </div>
  ));
