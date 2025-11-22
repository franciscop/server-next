import type { Context, Server } from "..";
import getUser from "./getUser";
import logout from "./logout";
import providers from "./providers";

export default function auth(app: Server) {
  // Load the user from the middleware directly
  app.use(async function middle(ctx: Context) {
    ctx.user = await getUser(ctx);
  });

  if (app.settings.auth.provider.includes("github")) {
    if (!env.GITHUB_ID) throw new Error("GITHUB_ID not defined");
    if (!env.GITHUB_SECRET) throw new Error("GITHUB_SECRET not defined");
    app.get("/auth/logout", logout);
    app.get("/auth/login/github", providers.github.login);
    app.get("/auth/callback/github", providers.github.callback);
  }

  if (app.settings.auth.provider.includes("email")) {
    app.post("/auth/logout", logout);
    app.post("/auth/register/email", providers.email.register);
    app.post("/auth/login/email", providers.email.login);
    app.put("/auth/password/email", providers.email.password);
    app.put("/auth/reset/email", providers.email.reset);
  }
}
