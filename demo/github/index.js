import server, { redirect } from "../../";
import kv from "polystore";

const store = kv(`file://${process.cwd()}/session/`);

export default server({ store, auth: "cookie:github" })
  .get("/", (ctx) => redirect(ctx.user ? "/user" : "/login"))
  .get("/login", () => (
    <p>
      Login with <a href="/auth/login/github">Github</a>
    </p>
  ))
  .get("/user", async (ctx) => {
    if (!ctx.user) return redirect("/login");
    return <p>Hello {ctx.user.name}</p>;
  });
