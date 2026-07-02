import type { Options, Provider, Settings, Strategy } from "../types";
import providers from "./providers";

const defaultRedirect = "/user";

function defaultCleanUser(fullUser: any) {
  const { password: _password, ...user } = fullUser;
  return user;
}

const available = Object.keys(providers);

export default function parseAuthOptions(
  auth: Options["auth"],
  all: Options,
): Settings["auth"] {
  if (!auth) return null;

  // The string form is a single provider (`<strategy>:<provider>`). For several
  // providers, use the object form with a `providers` array.
  if (typeof auth === "string") {
    const [strategy, provider] = auth.split(":") as [Strategy, Provider];
    auth = { strategy, providers: provider ? [provider] : [] };
  }

  if (!auth.strategy?.length) {
    throw new Error("Auth options needs a strategy");
  }
  const strategy = auth.strategy;

  const list = Array.isArray(auth.providers)
    ? auth.providers
    : auth.providers
      ? [auth.providers]
      : [];
  if (!list.length) {
    throw new Error("Auth options needs a provider");
  }
  const invalid = list.find((p) => !available.includes(p));
  if (invalid) {
    throw new Error(
      `Provider "${invalid}" not found, available ones are "${available.join('", "')}"`,
    );
  }

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
    strategy,
    providers: list,
    redirect,
    cleanUser,
    store,
    session,
  };
}
