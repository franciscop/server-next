import { cookies, json, redirect, status } from "../reply";
import ServerError from "../ServerError";
import type {
  AuthConfig,
  AuthEntry,
  AuthProfile,
  Context,
  ProviderOptions,
  Strategy,
} from "../types";
import type { Server } from "..";
import { inCookie, isSigned, issue, meta, read } from "./credential";
import type { Provider } from "./providers/oauth";
import shipped, { ISSUERS } from "./providers";
import oidcProvider from "./providers/oidc";
import { readState, startState, STATE_COOKIE } from "./state";

const SPEC = { schema: { tags: "auth" } };

// The client-owned flow announces itself by asking for JSON
const wantsJson = (ctx: Context): boolean =>
  String(ctx.headers.accept || "").includes("application/json");

// `providers` takes a name, a list of names, or an object keyed by name whose
// value is an issuer URL or that provider's options
function parseProviders(given: AuthConfig["providers"]) {
  const map: Record<string, ProviderOptions> =
    typeof given === "string"
      ? { [given]: {} }
      : Array.isArray(given)
        ? Object.fromEntries(given.map((name) => [name, {}]))
        : ({ ...(given as object) } as Record<string, any>);

  const out: { name: string; options: ProviderOptions; provider: Provider }[] =
    [];
  for (const [name, raw] of Object.entries(map)) {
    const options: ProviderOptions =
      typeof raw === "string" ? { issuer: raw } : { ...raw };
    // A name we know the issuer for behaves exactly like one given by URL
    if (!options.issuer && !shipped[name] && ISSUERS[name]) {
      options.issuer = ISSUERS[name];
    }
    if (options.issuer) {
      out.push({ name, options, provider: oidcProvider(name) });
    } else if (shipped[name]) {
      out.push({ name, options, provider: shipped[name] });
    } else {
      throw new Error(
        `Unknown provider "${name}". Give it an \`issuer\` to use any OIDC ` +
          `provider, or pick one of "${Object.keys(shipped).join('", "')}".`,
      );
    }
  }
  if (!out.length) throw new Error("Auth needs at least one provider");
  return out;
}

const target = async (
  where: any,
  fallback: string,
  user: any,
  ctx: Context,
): Promise<string> =>
  typeof where === "function" ? where(user, ctx) : (where ?? fallback);

export function entry(config: AuthConfig): AuthEntry {
  const list = parseProviders(config.providers);
  const strategies = (
    Array.isArray(config.strategy)
      ? config.strategy
      : [config.strategy ?? "session"]
  ) as Strategy[];
  for (const one of strategies) {
    if (!["session", "cookie", "token", "jwt"].includes(one)) {
      throw new Error(
        `Unknown strategy "${one}"; it takes 'session', 'cookie', 'token' or 'jwt'.`,
      );
    }
  }
  const expires = config.expires ?? "30d";

  const { onLogin, getUser, toPublicUser, onLogout } = config;

  // Callbacks are all or nothing. With none, there is no database, so the
  // profile itself is signed and only the signed strategies can work.
  if (onLogin && !getUser) {
    throw new Error("`onLogin` needs a `getUser`: something has to resolve the id it returns.");
  }
  for (const strategy of strategies) {
    if (isSigned(strategy)) {
      if (getUser && !toPublicUser) {
        throw new Error(
          `The \`${strategy}\` strategy signs the user into the credential, so it ` +
            "needs a `toPublicUser` to say what goes in. Signing the whole row " +
            "would publish whatever else is on it.",
        );
      }
    } else if (!getUser) {
      throw new Error(
        `The \`${strategy}\` strategy puts an id in the credential, so it needs a ` +
          "`getUser` to resolve it. With no database, use `cookie` or `jwt`.",
      );
    }
  }

  const redirects = (typeof config.redirect === "object" ? config.redirect : {}) as any;
  const loginTo = typeof config.redirect === "object" ? redirects.login : config.redirect;

  const finish = async (ctx: Context, profile: AuthProfile) => {
    // Signed strategies with no callbacks carry the profile itself
    const payload = getUser
      ? await (async () => {
          const id = await onLogin!(profile, ctx);
          if (id === undefined || id === null) {
            throw new Error("`onLogin` must return the id the credential points at");
          }
          if (!isSigned(strategies[0])) return { sub: String(id) };
          const user = await getUser(String(id), ctx);
          return { user: await toPublicUser!(user) };
        })()
      : { user: profile };
    // Which provider they used is part of the login, not of the person, so it
    // rides in the credential rather than in your user row
    const signed = { ...payload, provider: profile.provider };

    const token = await issue(ctx, signed, expires);
    const user = signed.user ?? (await getUser!(signed.sub as string, ctx));
    const to = await target(loginTo, "/", user, ctx);

    if (inCookie(strategies[0])) {
      return cookies("session", {
        value: token,
        path: "/",
        expires,
        httpOnly: true,
        secure: ctx.platform.production,
        sameSite: "Lax",
      }).redirect(to);
    }
    // The client holds the credential, but the browser is what lands here, so
    // it rides in the fragment: never sent to a server, never logged
    return redirect(`${to}#token=${token}`);
  };

  return {
    name: "flow",

    async user(ctx: Context) {
      const found = await read(ctx, strategies);
      if (!found) return;
      const { payload, strategy } = found;
      ctx.auth = meta(payload, strategy);
      if (payload.user) return payload.user;
      if (!payload.sub) return;
      return getUser!(payload.sub, ctx);
    },

    routes(app: Server) {
      for (const { name, options, provider } of list) {
        app.get(`/auth/login/${name}`, SPEC, async (ctx: Context) => {
          const { url, state, payload } = await provider.authorize(ctx, options);
          // A script asking for JSON gets the URL and sends the person there
          // itself; a browser gets the redirect. Both carry the state cookie:
          // a same-origin fetch stores it, so the callback's check passes
          // either way.
          const cookie = await startState(ctx, { state, payload });
          if (wantsJson(ctx)) {
            return cookies(STATE_COOKIE, cookie).json({ url });
          }
          return cookies(STATE_COOKIE, cookie).redirect(url);
        });

        const callback = async (ctx: Context) => {
          const query = ctx.url.query as Record<string, string>;
          if (query.error) {
            const to = await target(redirects.error, "/", null, ctx);
            return redirect(`${to}?error=${encodeURIComponent(query.error)}`);
          }
          // Always, whatever the credential is. The callback is a browser
          // navigation under every strategy, so without this an attacker can
          // walk someone's browser through it with their own code and leave
          // them signed in as the attacker.
          const pending = await readState(ctx, query.state);
          if (!query.code) throw ServerError.AUTH_NO_CODE();

          let res: any;
          try {
            const profile = await provider.exchange(
              ctx,
              options,
              query.code,
              pending,
            );
            res = await finish(ctx, profile);
          } catch (error) {
            // `onLogin` refuses a login by throwing, and its message is meant
            // for the person reading it
            const to = await target(redirects.error, "/", null, ctx);
            const message = (error as Error).message;
            res = redirect(`${to}?error=${encodeURIComponent(message)}`);
          }
          // One-time use: the state is spent
          res.headers.append(
            "set-cookie",
            `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly`,
          );
          return res;
        };

        app.get(`/auth/callback/${name}`, SPEC, callback);
      }

      app.post("/auth/logout", SPEC, async (ctx: Context) => {
        const found = await read(ctx, strategies).catch(() => undefined);
        if (onLogout && found?.payload.sub) {
          await onLogout(found.payload.sub, ctx);
        }
        const to = await target(redirects.logout, "/", null, ctx);
        if (!inCookie(strategies[0])) return status(204);
        return cookies("session", { value: null }).redirect(to);
      });
    },
  };
}
