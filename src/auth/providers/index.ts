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

// An alias gets its own instance rather than sharing the target's, so its
// credentials come from the name you actually typed (`COGNITO_ID`, not
// `AMAZONCOGNITO_ID`).
for (const [alias, target] of Object.entries(ALIASES)) {
  providers[alias] = antarcticProvider(alias, CLASSES[target]);
}

// Providers that speak OIDC need no code at all: discovery finds their
// endpoints and the id_token claims are already the profile. A name here is
// only a shortcut for an issuer the user would otherwise have to look up.
export const ISSUERS: Record<string, string> = {
  paypal: "https://www.paypal.com",
};

export default providers;
