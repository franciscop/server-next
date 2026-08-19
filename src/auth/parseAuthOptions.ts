import toStore, { toStoreExpiring } from "../helpers/store";
import type { Options, Provider, Settings, Strategy } from "../types";
import providers from "./providers";

type AuthSettings = NonNullable<Settings["auth"]>;

const defaultRedirect = "/user";

// The default `onUser`: never expose a stored credential
function defaultOnUser(fullUser: any) {
  const { password: _password, ...user } = fullUser;
  return user;
}

const available = Object.keys(providers);

export default function parseAuthOptions(
  auth: Options["auth"],
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
  const { onProfile, onLogin, onLogout } = auth;
  const onUser = auth.onUser || defaultOnUser;
  // The jwt payload builder; the default keeps the hash out of the token
  const onToken = auth.onToken || defaultOnUser;

  // A raw Map/client is accepted here too. No defaults: config fills them with
  // in-memory Maps in development, and refuses to boot in production.
  const users = auth.users ? toStore(auth.users) : null;
  // Raw sources get a 1w expiry; a built store keeps its own policy
  const sessions = auth.sessions ? toStoreExpiring(auth.sessions, "1w") : null;

  return {
    strategy,
    providers: list,
    redirect,
    onProfile,
    onLogin,
    onUser,
    onToken,
    onLogout,
    users,
    sessions,
  } as AuthSettings;
}
