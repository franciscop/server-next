import auth from "./auth.js";
import logout from "./logout.js";
import providers from "./providers/index.js";
import session from "./session.js";
import user from "./user.js";

const load = async (ctx) => {
  ctx.session = await session(ctx);
  ctx.auth = await auth(ctx);
  ctx.user = await user(ctx);
};

const middle = async (ctx) => {
  if (ctx.options.auth) {
    ctx.app.post("/auth/logout", logout);

    if (ctx.options.auth.provider.includes("github")) {
      if (!env.GITHUB_ID) throw new Error("GITHUB_ID not defined");
      if (!env.GITHUB_SECRET) throw new Error("GITHUB_SECRET not defined");
      ctx.app.get("/auth/login/github", providers.github.login);
      ctx.app.get("/auth/callback/github", providers.github.callback);
    }

    if (ctx.options.auth.provider.includes("email")) {
      ctx.app.post("/auth/register/email", providers.email.register);
      ctx.app.post("/auth/login/email", providers.email.login);
      ctx.app.put("/auth/password/email", providers.email.password);
      ctx.app.put("/auth/reset/email", providers.email.password);
    }
  }
};

export default { load, middle };
