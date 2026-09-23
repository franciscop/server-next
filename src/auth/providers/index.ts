import {
  AmazonCognito,
  AniList,
  Apple,
  Atlassian,
  Auth0,
  Authentik,
  Autodesk,
  BattleNet,
  Bitbucket,
  Box,
  Bungie,
  Coinbase,
  Discord,
  DonationAlerts,
  Dribbble,
  Dropbox,
  Etsy,
  EpicGames,
  Facebook,
  Figma,
  Gitea,
  GitHub,
  GitLab,
  Google,
  Intuit,
  Kakao,
  Kick,
  KeyCloak,
  Lichess,
  Line,
  Linear,
  LinkedIn,
  Mastodon,
  MercadoLibre,
  MercadoPago,
  MicrosoftEntraId,
  MyAnimeList,
  Naver,
  Notion,
  Okta,
  Osu,
  Patreon,
  Polar,
  Reddit,
  Roblox,
  Salesforce,
  Shikimori,
  Slack,
  Spotify,
  StartGG,
  Strava,
  TikTok,
  Tiltify,
  Tumblr,
  Twitch,
  Twitter,
  VK,
  Withings,
  WorkOS,
  Yahoo,
  Yandex,
  Zoom,
  FortyTwo,
} from "antarctic";
import antarcticProvider from "./antarctic";
import type { Provider } from "./oauth";
import oidcProvider from "./oidc";
import type { AuthConfig, ProviderOptions } from "../../types";

// Every provider [antarctic](https://github.com/franciscop/antarctic) ships,
// which owns the endpoints, the token exchange and the profile mapping for
// each one. Adding a provider here is a name and a class.
const CLASSES: Record<string, any> = {
  amazoncognito: AmazonCognito,
  anilist: AniList,
  apple: Apple,
  atlassian: Atlassian,
  auth0: Auth0,
  authentik: Authentik,
  autodesk: Autodesk,
  battlenet: BattleNet,
  bitbucket: Bitbucket,
  box: Box,
  bungie: Bungie,
  coinbase: Coinbase,
  discord: Discord,
  donationalerts: DonationAlerts,
  dribbble: Dribbble,
  dropbox: Dropbox,
  etsy: Etsy,
  epicgames: EpicGames,
  facebook: Facebook,
  figma: Figma,
  gitea: Gitea,
  github: GitHub,
  gitlab: GitLab,
  google: Google,
  intuit: Intuit,
  kakao: Kakao,
  kick: Kick,
  keycloak: KeyCloak,
  lichess: Lichess,
  line: Line,
  linear: Linear,
  linkedin: LinkedIn,
  mastodon: Mastodon,
  mercadolibre: MercadoLibre,
  mercadopago: MercadoPago,
  microsoftentraid: MicrosoftEntraId,
  myanimelist: MyAnimeList,
  naver: Naver,
  notion: Notion,
  okta: Okta,
  osu: Osu,
  patreon: Patreon,
  polar: Polar,
  reddit: Reddit,
  roblox: Roblox,
  salesforce: Salesforce,
  shikimori: Shikimori,
  slack: Slack,
  spotify: Spotify,
  startgg: StartGG,
  strava: Strava,
  tiktok: TikTok,
  tiltify: Tiltify,
  tumblr: Tumblr,
  twitch: Twitch,
  twitter: Twitter,
  vk: VK,
  withings: Withings,
  workos: WorkOS,
  yahoo: Yahoo,
  yandex: Yandex,
  zoom: Zoom,
  fortytwo: FortyTwo,
};

// The product name, shortened to its distinctive word, for the two whose
// full spelling is a mouthful: Amazon Cognito and Microsoft Entra ID.
// `microsoft` stays as a convenience, since that is what the button says.
const ALIASES: Record<string, string> = {
  cognito: "amazoncognito",
  entra: "microsoftentraid",
  microsoft: "microsoftentraid",
};

const providers: Record<string, Provider> = Object.fromEntries(
  Object.entries(CLASSES).map(([name, Client]) => [
    name,
    antarcticProvider(name, Client),
  ]),
);

// An alias gets its own instance, so it mounts under the name you typed
// (`/auth/login/cognito`); its credentials are the provider's own
// (`AMAZON_COGNITO_CLIENT_ID`), since that is what they are.
for (const [alias, target] of Object.entries(ALIASES)) {
  providers[alias] = antarcticProvider(alias, CLASSES[target]);
}

// Providers that speak OIDC need no code at all: discovery finds their
// endpoints and the id_token claims are already the profile. A name here is
// only a shortcut for an issuer the user would otherwise have to look up.
const ISSUERS: Record<string, string> = {
  paypal: "https://www.paypal.com",
};

// One provider as the flow runs it: the name it is mounted under, the options
// it was configured with, and what executes the handshake
export type Named = {
  name: string;
  options: ProviderOptions;
  provider: Provider;
};

// `providers` takes a name, a list of names, or an object keyed by name whose
// value is an issuer URL or that provider's options; every form ends up here
// as name -> options
function normalizeProviders(
  given: AuthConfig["providers"],
): Record<string, ProviderOptions> {
  if (typeof given === "string") return { [given]: {} };
  if (Array.isArray(given)) {
    return Object.fromEntries(given.map((name) => [name, {}]));
  }
  const map: Record<string, ProviderOptions> = {};
  for (const [name, raw] of Object.entries(given)) {
    map[name] = typeof raw === "string" ? { issuer: raw } : { ...raw };
  }
  return map;
}

// Pick what runs each provider: anything with an issuer goes through OIDC
// discovery, a shipped name uses its own class
function resolveProvider(name: string, options: ProviderOptions): Provider {
  // A name we know the issuer for behaves exactly like one given by URL
  if (!options.issuer && !providers[name] && ISSUERS[name]) {
    options.issuer = ISSUERS[name];
  }
  if (options.issuer) return oidcProvider(name);
  if (providers[name]) return providers[name];
  throw new Error(
    `Unknown provider "${name}". Give it an \`issuer\` to use any OIDC ` +
      `provider, or pick one of "${Object.keys(providers).join('", "')}".`,
  );
}

// Options renamed to the OAuth terms, which fail loudly rather than being
// passed through to the provider as unknown keys
const RENAMED: Record<string, string> = {
  id: "clientId",
  secret: "clientSecret",
  scope: "scopes",
};

export function parseProviders(given: AuthConfig["providers"]): Named[] {
  const map = normalizeProviders(given);
  const list = Object.entries(map).map(([name, options]) => {
    for (const [from, to] of Object.entries(RENAMED)) {
      if (options[from] !== undefined) {
        throw new Error(`Provider "${name}": \`${from}\` is now \`${to}\`.`);
      }
    }
    const provider = resolveProvider(name, options);
    // Checked at boot like every other auth misconfiguration: left unchecked,
    // a missing client id only surfaces when someone clicks "Log in".
    try {
      provider.check(options);
    } catch (error: any) {
      // The variables were <NAME>_ID / <NAME>_SECRET before the rename
      const old = `${name.toUpperCase()}_ID`;
      const renamed = env[old]
        ? ` ${old} and ${name.toUpperCase()}_SECRET are no longer read; rename them.`
        : "";
      // Antarctic speaks of its own constructor; here that is the provider's options
      const message = error.message.replace(
        "in the constructor options",
        "in this provider's options",
      );
      throw new Error(`Provider "${name}": ${message}.${renamed}`);
    }
    return { name, options, provider };
  });
  if (!list.length) throw new Error("Auth needs at least one provider");
  return list;
}

export default providers;
