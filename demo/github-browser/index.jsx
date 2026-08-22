import server, { redirect } from "../../";

// The whole login: no database, no store, no callbacks. The GitHub profile is
// signed into the cookie, so `ctx.user` is there on every request.
export default server({ auth: "cookie:github" })
  .get("/", (ctx) => redirect(ctx.user ? "/user" : "/login"))
  .get("/login", () => (
    <p>
      Login with <a href="/auth/login/github">Github</a>
    </p>
  ))
  .get("/user", (ctx) => {
    if (!ctx.user) return redirect("/login");
    return (
      <p>
        Hello {ctx.user.name} <br />
        <form method="POST" action="/auth/logout">
          <button type="submit">Logout</button>
        </form>
      </p>
    );
  });
