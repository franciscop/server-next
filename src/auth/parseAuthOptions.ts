import type { Options, Provider, Settings, Strategy } from "../types";
import providers from "./providers";

const defaultRedirect = "/user";

function defaultCleanUser(fullUser: any) {
  const { password: _password, ...user } = fullUser;
  return user;
}

const providersKeys = Object.keys(providers);
function getProviders(provider: string | string[]): Provider[] {
  if (typeof provider === "string") {
    provider = provider.split("|");
  }

  const invalidProvider = provider.find((p) => !providersKeys.includes(p));
  if (invalidProvider) {
    throw new Error(
      `Provider "${invalidProvider}" not found, available ones are "${providersKeys.join('", "')}"`,
    );
  }
  return provider as Provider[];
}

export default function parseAuthOptions(
  auth: Options["auth"],
  all: Options,
): Settings["auth"] {
  if (!auth) return null;

  if (typeof auth === "string") {
    const [strategy, providerRaw] = auth.split(":") as [Strategy, string];
    const provider = providerRaw && (providerRaw.split("|") as Provider[]);
    auth = { strategy, provider };
  }
  if (!auth.strategy) {
    throw new Error("Auth options needs a strategy");
  }
  if (!auth.strategy.length) {
    throw new Error("Auth options needs a strategy");
  }
  const strategy = auth.strategy;

  if (!auth.provider || !auth.provider.length) {
    throw new Error("Auth options needs a provider");
  }
  const provider = getProviders(auth.provider);

  const redirect = auth.redirect || defaultRedirect;
  const cleanUser = auth.cleanUser || defaultCleanUser;

  if (!auth.store && !all.store) {
    throw new Error("Need a userStore store for Auth");
  }
  if (!auth.session && !all.store) {
    throw new Error("Need a sessionStore store for Auth");
  }
  const store = auth.store || all.store.prefix("user:");
  const session = auth.session || all.store.prefix("auth:");

  return {
    // Base main configuration
    strategy,
    provider,

    // Extra configuration
    redirect,
    cleanUser,

    // Stores for the auth session and users
    store,
    session,
  };
}
