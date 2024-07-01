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

    if (ctx.options.auth.provider.includes("email")) {
      ctx.app.post("/auth/register/email", providers.email.register);
      ctx.app.post("/auth/login/email", providers.email.login);
      ctx.app.put("/auth/password/email", providers.email.password);
      ctx.app.put("/auth/reset/email", providers.email.password);
    }
  }
};

export default { load, middle };
