import type { Context } from "../types";
import type { Router } from "../router";

type Awaitable<T> = T | Promise<T>;

export type Strategy = "session" | "cookie" | "token" | "jwt";

// What every provider produces, normalised, so adding one is not a code change.
// `raw` keeps the untouched response for provider-specific fields.
export type AuthProfile = {
  provider: string;
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  raw: Record<string, any>;
};

// What the credential itself asserts, with no lookup behind it. Present
// whenever a credential we can read authenticated the request, so absent for
// the function and library shapes, where there is nothing of ours to parse.
export type AuthMeta = {
  issuedAt: Date;
  expiresAt?: Date;
  // How this particular request authenticated, when several are accepted
  strategy?: Strategy;
  // Who vouched for them: the provider they logged in with, or the issuer
  provider?: string;
};

// A verified token's payload; `sub` is the person's id at that issuer
export type AuthClaims = { sub: string } & Record<string, any>;

// Only the handshake is configured per provider; everything else is app-wide.
// Unknown keys pass through to that provider's authorize URL.
export type ProviderOptions = {
  id?: string;
  secret?: string;
  scope?: string | string[];
  // An OIDC issuer, which makes this a generic provider: discovery finds its
  // endpoints and the id_token claims become the profile
  issuer?: string;
} & Record<string, any>;

// The object form of `redirect`; a bare target is shorthand for `login`
export type RedirectTargets = {
  login?: string | ((user: any, ctx: Context) => Awaitable<string>);
  logout?: string;
  error?: string;
};

export type RedirectOption =
  | string
  | ((user: any, ctx: Context) => Awaitable<string>)
  | RedirectTargets;

// A login flow we run: the routes are mounted here, the credential is ours
export type AuthConfig<U = AuthProfile> = {
  providers: string | readonly string[] | Record<string, string | ProviderOptions>;
  strategy?: Strategy;
  expires?: string;
  redirect?: RedirectOption;
  // Once, after a handshake: store whoever this is and return the id the
  // credential points at. Refuse a login by throwing
  onLogin?: (
    profile: AuthProfile,
    ctx: Context,
  ) => Awaitable<string | number | undefined>;
  // That id back into the user. Per request for `session` and `token`, once at
  // login for `cookie` and `jwt`
  getUser?: (id: string, ctx: Context) => Awaitable<U>;
  // What gets signed into the credential, for `cookie` and `jwt`
  toPublicUser?: (user: any) => Awaitable<any>;
  // Anything of yours that should go when the credential is cleared
  onLogout?: (id: string, ctx: Context) => Awaitable<void>;
};

// A credential minted elsewhere: no routes, no client secret, no flow.
// `audience` is required, since one issuer serves many applications
export type AuthVerify<U = AuthClaims> = {
  // The OIDC issuer whose tokens this accepts, the same URL a provider would
  // take. Its keys are discovered from it and cached.
  issuer: string;
  audience: string | readonly string[];
  // Where the token rides. Defaults to `Authorization: Bearer`; name a cookie
  // when their SDK stores it there for a same-origin app
  cookie?: string;
  // Which claim carries the audience. Standard is `aud`, but Clerk uses
  // `azp` and Cognito access tokens use `client_id`. The first one present
  // is the one checked.
  audienceClaim?: string | readonly string[];
  getUser?: (id: string, ctx: Context) => Awaitable<U>;
};

// A library that runs its own handshake and serves its own routes
export type AuthInstance = {
  handler: (request: Request) => Awaitable<Response>;
  path?: string;
  user?: (ctx: Context) => Awaitable<any>;
};

// Request in, user out, for a credential we did not mint
export type AuthFunction<U = any> = (ctx: Context<any>) => Awaitable<U>;

// The string form is `<strategy>:<provider>` and takes no callbacks, so there
// is no database: the profile itself is signed into the credential.
export type AuthOption =
  | string
  | AuthFunction
  | AuthConfig<any>
  | AuthVerify<any>
  | AuthInstance;

// What an entry's `user()` may rely on. An HTTP request passes the full
// Context; a WebSocket upgrade has no request/response cycle, so it builds
// exactly this subset (see auth/socketUser.ts). An entry needing more than
// this cannot resolve socket users.
export type AuthContext = Pick<
  Context,
  "options" | "headers" | "cookies" | "platform" | "app"
>;

// Every shape normalises to this: resolve a user, and optionally own routes
export type AuthEntry = {
  name: string;
  user: (ctx: AuthContext) => Promise<any>;
  routes?: () => Router;
};

export type AuthSettings = AuthEntry;
