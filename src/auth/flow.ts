import { cookies, redirect, status } from "../reply";
import router from "../router";
import ServerError from "../errors";
import type {
  AuthConfig,
  AuthEntry,
  AuthProfile,
  Context,
  RedirectTargets,
  Strategy,
} from "../types";
import { clearCookie } from "../http/createCookies";
import {
  authCookie,
  credentialPayload,
  inCookie,
  issue,
  meta,
  NAME,
  read,
  validate,
} from "./credential";
import { type Named, parseProviders } from "./providers";
import { callbackPath } from "./providers/oauth";
import { readState, startState, STATE_COOKIE } from "./state";

const SPEC = { schema: { tags: "auth" } };

// Closes a successful exchange: issues the credential and redirects
type Finish = (ctx: Context, profile: AuthProfile) => Promise<any>;

// The client-owned flow announces itself by asking for JSON
const wantsJson = (ctx: Context): boolean =>
  String(ctx.headers.accept || "").includes("application/json");

const target = async (
  where: any,
  fallback: string,
  user: any,
  ctx: Context,
): Promise<string> =>
  typeof where === "function" ? where(user, ctx) : (where ?? fallback);

// Where a failed login lands. Only a code goes in the URL, never text: a
// message there could leak internals, and anyone could link to the page with
// one of their own. The app turns the code into words.
const errorRedirect = async (
  redirects: RedirectTargets,
  ctx: Context,
  code: string,
) => {
  const to = await target(redirects.error, "/", null, ctx);
  return redirect(`${to}${to.includes("?") ? "&" : "?"}error=${code}`);
};

const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

// A ServerError is a deliberate refusal and names its own code; anything else
// is a failure (a bug, the provider down) and is logged for the operator
function failureCode(error: any, name: string): string {
  if (error instanceof ServerError && CODE.test(error.code)) return error.code;
  console.error(`[server:auth] ${name} callback failed:`, error);
  return "LOGIN_FAILED";
}

// The provider's refusal, from the standard OAuth 2.0 and OpenID Connect codes
// only: it is read before the state check, so anyone can craft this parameter
const PROVIDER_CODES = new Set([
  "invalid_request",
  "unauthorized_client",
  "access_denied",
  "unsupported_response_type",
  "invalid_scope",
  "server_error",
  "temporarily_unavailable",
  "interaction_required",
  "login_required",
  "account_selection_required",
  "consent_required",
]);
const providerCode = (value: string) =>
  PROVIDER_CODES.has(value) ? value.toUpperCase() : "LOGIN_FAILED";

// One-time use: the state is spent
const spendState = (res: any) => {
  res.headers.append("set-cookie", clearCookie(STATE_COOKIE));
  return res;
};

// GET /auth/login/:name, which hands the browser to the provider
const loginRoute =
  ({ provider, options }: Named) =>
  async (ctx: Context) => {
    const { url, state, payload } = await provider.authorize(ctx, options);
    // A script asking for JSON gets the URL and sends the person there itself;
    // a browser gets the redirect. Both carry the state cookie: a same-origin
    // fetch stores it, so the callback's check passes either way.
    const cookie = await startState(ctx, { state, payload });
    if (wantsJson(ctx)) {
      return cookies(STATE_COOKIE, cookie).json({ url });
    }
    return cookies(STATE_COOKIE, cookie).redirect(url);
  };

// GET /auth/callback/:name, where the provider sends the browser back
const callbackRoute =
  (
    { name, options, provider }: Named,
    redirects: RedirectTargets,
    finish: Finish,
  ) =>
  async (ctx: Context) => {
    const query = ctx.url.query as Record<string, string>;
    if (query.error) {
      return errorRedirect(redirects, ctx, providerCode(query.error));
    }

    // Always, whatever the credential is. The callback is a browser
    // navigation under every strategy, so without this an attacker can
    // walk someone's browser through it with their own code and leave
    // them signed in as the attacker.
    const pending = await readState(ctx, query.state);
    if (!query.code) throw ServerError.AUTH_NO_CODE();

    try {
      const profile = await provider.exchange(
        ctx,
        options,
        query.code,
        pending,
      );
      return spendState(await finish(ctx, profile));
    } catch (error) {
      const code = failureCode(error, name);
      return spendState(await errorRedirect(redirects, ctx, code));
    }
  };

export default function flowEntry(config: AuthConfig): AuthEntry {
  const list = parseProviders(config.providers);
  const strategy = (config.strategy ?? "session") as Strategy;
  const expires = config.expires ?? "30d";
  validate(strategy, expires, config);

  const { getUser, onLogout } = config;

  // A single target is shorthand for `{ login: target }`; logout and error
  // then use their fallbacks
  const redirects: RedirectTargets =
    typeof config.redirect === "object"
      ? config.redirect
      : { login: config.redirect };

  const finish: Finish = async (ctx, profile) => {
    const payload = await credentialPayload(config, strategy, ctx, profile);
    // Which provider they used is part of the login, not of the person, so it
    // rides in the credential rather than in your user row
    const signed = { ...payload, provider: profile.provider };

    const token = await issue(ctx, signed, expires);
    const user = signed.user ?? (await getUser!(signed.sub as string, ctx));
    const to = await target(redirects.login, "/", user, ctx);

    if (inCookie(strategy)) {
      return cookies(NAME, authCookie(ctx, token, expires)).redirect(to);
    }
    // The client holds the credential, but the browser is what lands here, so
    // it rides in the fragment: never sent to a server, never logged
    return redirect(`${to}#token=${token}`);
  };

  return {
    name: "flow",
    providers: list.map((one) => one.name),

    async user(ctx: Context) {
      const payload = await read(ctx, strategy);
      if (!payload) return;
      ctx.auth = meta(payload, strategy);
      if (payload.user) return payload.user;
      if (!payload.sub) return;
      return getUser!(payload.sub, ctx);
    },

    routes() {
      const r = router();
      for (const one of list) {
        r.get(`/auth/login/${one.name}`, SPEC, loginRoute(one));
        r.get(
          callbackPath(one.name),
          SPEC,
          callbackRoute(one, redirects, finish),
        );
      }
      r.post("/auth/logout", SPEC, async (ctx: Context) => {
        const payload = await read(ctx, strategy).catch(() => undefined);
        // `session` and `token` carry the id; `cookie` and `jwt` carry the
        // signed user instead, so the id comes from inside it there
        const id = payload?.sub ?? payload?.user?.id;
        if (onLogout && id != null) await onLogout(String(id), ctx);
        const to = await target(redirects.logout, "/", null, ctx);
        if (!inCookie(strategy)) return status(204);
        return cookies(NAME, { value: null }).redirect(to);
      });
      return r;
    },
  };
}
