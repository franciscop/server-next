import type { Context, Options, Provider, Strategy } from "..";
import auth from "./auth";
import logout from "./logout";
import providers from "./providers";
import session from "./session";
import user from "./user";

const parseOptions = (auth: Options["auth"], all: any): any => {
  if (!auth) return null;

  if (typeof auth === "string") {
    const [strategy, provider] = auth.split(":") as [Strategy, Provider];
    auth = { strategy, provider };
  }
  if (typeof auth.strategy === "string") {
    auth.strategy = auth.strategy.split("|").filter(Boolean) as Strategy[];
  }
  if (typeof auth.provider === "string") {
    auth.provider = auth.provider.split("|").filter(Boolean) as Provider[];
  }
  if (!auth.strategy) {
    throw new Error("Auth options needs a strategy");
  }
  if (!auth.strategy.length) {
    throw new Error("Auth options needs a strategy");
  }
  if (!auth.provider || !auth.provider.length) {
    throw new Error("Auth options needs a provider");
  }
  const providerNotFound = auth.provider.find((p: string) => !providers[p]);
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
    auth.cleanUser = (fullUser: any) => {
      const { password: _password, ...user } = fullUser;
      return user;
    };
  }
  if (!auth.redirect) {
    auth.redirect = "/user";
  }
  return auth;
};

const load = async (ctx: Context): Promise<Context> => {
  ctx.session = await session(ctx);
  ctx.auth = await auth(ctx);
  ctx.user = await user(ctx);
  return ctx;
};

const middle = async (ctx: Context): Promise<void> => {
  if (ctx.options.auth) {
    if (ctx.options.auth.provider.includes("github")) {
      if (!env.GITHUB_ID) throw new Error("GITHUB_ID not defined");
      if (!env.GITHUB_SECRET) throw new Error("GITHUB_SECRET not defined");
      ctx.app.get("/auth/logout", logout);
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
