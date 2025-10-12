import auth from "./auth.js";
import logout from "./logout.js";
import providers from "./providers/index.js";
import session from "./session.js";
import user from "./user.js";

const parseOptions = (auth, all) => {
  if (!auth) return null;

  if (typeof auth === "string") {
    const [type, provider] = auth.split(":");
    auth = { type, provider };
  }
  // if (typeof auth.type === "string") {
  //   auth.type = auth.type.split("|").filter(Boolean);
  // }
  if (typeof auth.provider === "string") {
    auth.provider = auth.provider.split("|").filter(Boolean);
  }
  if (!auth.type) {
    throw new Error("Auth options needs a type");
  }
  // if (!auth.type.length) {
  //   throw new Error("Auth options needs a type");
  // }
  if (!auth.provider || !auth.provider.length) {
    throw new Error("Auth options needs a provider");
  }
  const providerNotFound = auth.provider.find((p) => !providers[p]);
  if (providerNotFound) {
    throw new Error(
      `Provider "${providerNotFound}" not found, available ones are "${Object.keys(providers).join('", "')}"`,
    );
  }

  if (!auth.session && all.store) {
    auth.session = all.store.prefix("auth:");
  }
  if (!auth.store && all.store) {
    auth.store = all.store.prefix("user:");
  }
  if (!auth.cleanUser) {
    auth.cleanUser = (fullUser) => {
      const { password, token, ...user } = fullUser;
      return user;
    };
  }
  if (!auth.redirect) {
    auth.redirect = "/user";
  }
  return auth;
};

const load = async (ctx) => {
  ctx.session = await session(ctx);
  ctx.auth = await auth(ctx);
  ctx.user = await user(ctx);
};

const middle = async (ctx) => {
  if (ctx.options.auth) {
    if (ctx.options.auth.provider.includes("github")) {
      if (!env.GITHUB_ID) throw new Error("GITHUB_ID not defined");
      if (!env.GITHUB_SECRET) throw new Error("GITHUB_SECRET not defined");
      ctx.app.get(
        "/auth/logout",
        { tags: "Auth", title: "Github logout" },
        logout,
      );
      ctx.app.get(
        "/auth/login/github",
        { tags: "Auth" },
        providers.github.login,
      );
      ctx.app.get(
        "/auth/callback/github",
        { tags: "Auth", title: "Github callback" },
        providers.github.callback,
      );
    }

    if (ctx.options.auth.provider.includes("email")) {
      ctx.app.post("/auth/logout", { tags: "Auth" }, logout);
      ctx.app.post(
        "/auth/register/email",
        { tags: "Auth" },
        providers.email.register,
      );
      ctx.app.post(
        "/auth/login/email",
        { tags: "Auth" },
        providers.email.login,
      );
      ctx.app.put(
        "/auth/password/email",
        { tags: "Auth" },
        providers.email.password,
      );
      ctx.app.put("/auth/reset/email", { tags: "Auth" }, providers.email.reset);
    }
  }
};

export default { load, parseOptions, middle };
