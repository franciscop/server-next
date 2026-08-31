import type { AuthProfile, Context, ProviderOptions } from "../../types";
import toArray from "../../util/toArray";
import type { Provider } from "./oauth";
import { callbackUrl, credentials, passthrough } from "./oauth";

// Every provider antarctic ships, wrapped once. Their classes already own the
// endpoints, the token exchange and the profile mapping, so this only bridges
// two things: their options shape, and where the OAuth state lives.
//
// They take a `store` for the state, but expose it on the way out
// (`getAuthorizationURL` returns it) and accept it on the way back
// (`getUser(query, saved)`). We keep it in a signed cookie instead, so the
// store here is a per-request stand-in that persists nothing.
const nowhere = {
  get: async () => null,
  set: async () => {},
  del: async () => {},
};

export default function antarcticProvider(
  name: string,
  Client: any,
): Provider {
  const client = (ctx: Context, options: ProviderOptions) => {
    // A missing id was already refused at boot (parseProviders)
    const { id, secret } = credentials(name, options);
    return new Client({
      // Whatever that provider needs beyond the standard four: Auth0 takes a
      // `domain`, Keycloak a `realm`, Gitea a `baseURL`, Mastodon an
      // `instance`. Unknown keys go straight through.
      ...passthrough(options),
      clientId: id,
      clientSecret: secret,
      redirectURI: callbackUrl(ctx, name),
      // One list whether given as an array or a space-separated string
      scopes: options.scope
        ? toArray<string>(options.scope).flatMap((s) => s.split(" "))
        : undefined,
      store: nowhere,
    });
  };

  return {
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
