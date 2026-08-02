import toStore from "../helpers/store";
import type { Options, Provider, Settings, Strategy } from "../types";
import providers from "./providers";

const defaultRedirect = "/user";

// The default `onUser`: never expose a stored credential
function defaultOnUser(fullUser: any) {
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
  const { onProfile, onLogin, onLogout } = auth;
  const onUser = auth.onUser || defaultOnUser;

  if (!auth.store && !all.store) {
    throw new Error("Need a userStore store for Auth");
  }
  if (!auth.session && !all.store) {
    throw new Error("Need a sessionStore store for Auth");
  }
  // Same handling as the top-level `store`: a raw Map/client is accepted here
  // too. The guards above ensure `store` is non-null whenever it's needed
  // (auth.store/auth.session falsy implies all.store is set), which TS can't
  // see through the ternary, hence the `!`.
  const store = all.store ? toStore(all.store) : null;
  const authStore = auth.store ? toStore(auth.store) : store!.prefix("user:");
  const sessionStore = auth.session
    ? toStore(auth.session)
    : store!.prefix("auth:");

  return {
    strategy,
    providers: list,
    redirect,
    onProfile,
    onLogin,
    onUser,
    onLogout,
    store: authStore,
    session: sessionStore,
  };
}
