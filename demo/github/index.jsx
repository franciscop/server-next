import server, { redirect } from "../../";
import kv from "polystore";

const disk = kv(`file://${process.cwd()}/session/`);

export default server({
  sessions: disk.prefix("session:"),
  auth: { strategy: "cookie", providers: ["github"], users: disk.prefix("users:") },
})
  .get("/", (ctx) => redirect(ctx.user ? "/user" : "/login"))
  .get("/login", () => (
    <p>
      Login with <a href="/auth/login/github">Github</a>
    </p>
  ))
  .get("/user", async (ctx) => {
    if (!ctx.user) return redirect("/login");
    return (
      <p>
        Hello {ctx.user.name} <br />
        <a href="/auth/logout">Logout</a>
      </p>
    );
  });
