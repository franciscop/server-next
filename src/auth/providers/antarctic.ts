import type { AuthProfile, Context, ProviderOptions } from "../../types";
import toArray from "../../util/toArray";
import type { Provider } from "./oauth";
import { callbackUrl, passthrough } from "./oauth";

// Every provider antarctic ships, wrapped once. Their classes own the
// endpoints, the token exchange and the profile mapping; the state and PKCE
// payload come back from `getAuthorizationURL` for us to keep (in a signed
// cookie) and go back into `getUser`. It also reads the credentials, from
// <PROVIDER>_CLIENT_ID and _CLIENT_SECRET, unless they are passed explicitly.
export default function antarcticProvider(name: string, Client: any): Provider {
  const build = (options: ProviderOptions, redirectURI: string) =>
    new Client({
      // Whatever that provider needs beyond the standard four: Auth0 takes a
      // `domain`, Keycloak a `realm`, Gitea a `baseURL`, Mastodon an
      // `instance`. Unknown keys go straight through.
      ...passthrough(options),
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectURI,
      // One list whether given as an array or a space-separated string
      scopes: options.scopes
        ? toArray<string>(options.scopes).flatMap((s) => s.split(" "))
        : undefined,
    });
  const client = (ctx: Context, options: ProviderOptions) =>
    build(options, callbackUrl(ctx, name));

  return {
    // The real callback URL needs a request; any valid one proves the config
    check(options) {
      build(
        options,
        callbackUrl({ url: new URL("http://localhost") } as Context, name),
      );
    },

    async authorize(ctx, options) {
      const { url, state, payload } = await client(
        ctx,
        options,
      ).getAuthorizationURL();
      return { url: String(url), state, payload };
    },

    async exchange(ctx, options, code, pending): Promise<AuthProfile> {
      const user = await client(ctx, options).getUser(
        { code, state: pending.state },
        pending,
      );
      return {
        provider: name,
        id: String(user.id),
        email: user.email ?? "",
        name: user.name ?? undefined,
        avatar: user.image ?? undefined,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken ?? undefined,
        raw: (user.raw ?? {}) as Record<string, any>,
      };
    },
  };
}
