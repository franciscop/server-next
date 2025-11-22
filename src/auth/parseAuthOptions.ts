import type { Options, Provider, Strategy } from "../types";
import providers from "./providers";

export default function parseAuthOptions(auth: Options["auth"], all: any): any {
  if (!auth) return null;

  if (typeof auth === "string") {
    const [strategy, provider] = auth.split(":") as [Strategy, Provider];
    auth = { strategy, provider };
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
}
