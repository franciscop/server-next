import type { AuthProfile, Context, ProviderOptions } from "../../types";
import type { Provider } from "./oauth";
import createId from "../../util/createId";
import { decodeJwt } from "../jwt";
import { discover } from "../discovery";
import {
  callbackUrl,
  credentials,
  passthrough,
  scopeOf,
  search,
} from "./oauth";

// Any OIDC issuer, with no file of its own: the discovery document says where
// everything lives, and the id_token's claims already are the profile. That is
// Keycloak, Okta, Entra, Zitadel, Authentik, Auth0 and most corporate SSO.
//
// The id_token arrives over a direct TLS connection to the token endpoint, so
// its signature needs no separate check here (unlike a token handed to us by a
// client, which `verify` checks against the issuer's published keys).
const claims = (token: string): Record<string, any> => {
  const t = token ? decodeJwt(token) : null;
  if (!t) throw new Error("The issuer returned no usable id_token");
  return t.claims;
};

export default function oidcProvider(name: string): Provider {
  return {
    async authorize(ctx: Context, options: ProviderOptions) {
      const doc = await discover(options.issuer as string);
      const state = createId();
      const url = search(doc.authorization_endpoint, {
        client_id: credentials(name, options).id,
        response_type: "code",
        scope: scopeOf(options, "openid email profile"),
        redirect_uri: callbackUrl(ctx, name),
        state,
        ...passthrough(options),
      });
      return { url, state };
    },

    async exchange(ctx, options, code): Promise<AuthProfile> {
      const doc = await discover(options.issuer as string);
      const { id, secret } = credentials(name, options);
      const body = new URLSearchParams({
        client_id: id,
        client_secret: secret,
        code,
        grant_type: "authorization_code",
      });
      body.set("redirect_uri", callbackUrl(ctx, name));
      const res = await fetch(doc.token_endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) throw new Error(`${name}: token exchange failed`);
      const token = await res.json();
      const raw = claims(token.id_token);

      return {
        provider: name,
        id: String(raw.sub),
        email: raw.email,
        name: raw.name,
        avatar: raw.picture,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        raw,
      };
    },
  };
}
