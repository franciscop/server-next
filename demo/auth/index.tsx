import server, { Context, redirect } from "@server/next";
import kv from "polystore";

const store = kv(new Map());

const auth = {
  strategy: "cookie" as const,
  provider: "github" as const,
  redirect: "/",
};

const requireUser = (ctx: Context) => {
  if (!ctx.user) return redirect("/login");
};

export default server({ public: "public", store, auth })
  .head("/", () => 200)
  .get("/login", () => (
    <div>
      <h1>Login Demo</h1>
      <a href="/auth/login/github">Login with Github</a>
    </div>
  ))
  .get("/", requireUser, async (ctx) => (
    <div>
      <h1>Welcome {ctx.user.name}</h1>:
      <pre>{JSON.stringify(ctx.user, null, 2)}</pre>
    </div>
  ));
