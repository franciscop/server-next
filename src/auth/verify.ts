import { clearOnSend } from "../http/createCookies";
import { decodeJwt, unb64url } from "./jwt";
import ServerError from "../errors";
import type { AuthClaims, AuthEntry, AuthVerify, Context } from "../types";
import toArray from "../util/toArray";
import { bearer, meta } from "./credential";
import { bare, discover } from "./discovery";

const enc = new TextEncoder();

const ALGS: Record<string, any> = {
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
  RS384: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
  RS512: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" },
  ES384: { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" },
};

// An issuer publishes where everything lives at a fixed path; `jwks_uri` is
// arbitrary (`/certs`, `/keys`, ...), so it is always read from here rather
// than guessed. Fetched once and kept, keyed by `kid`; an unknown kid
// triggers one refetch (issuers rotate keys), at most once a minute so a
// flood of bogus kids cannot hammer the issuer.
const cache = new Map<string, { at: number; keys: Promise<Map<string, CryptoKey>> }>();

function keysOf(issuer: string, refresh = false): Promise<Map<string, CryptoKey>> {
  let entry = cache.get(issuer);
  if (!entry || (refresh && Date.now() - entry.at > 60_000)) {
    const keys = (async () => {
      const discovery = await discover(issuer);
      const set = await fetch(discovery.jwks_uri).then((r) => r.json());
      const out = new Map<string, CryptoKey>();
      for (const jwk of set.keys ?? []) {
        const algorithm = ALGS[jwk.alg];
        if (!algorithm) continue;
        out.set(
          jwk.kid,
          await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]),
        );
      }
      return out;
    })();
    // A failed fetch must not poison the cache, or one network blip breaks
    // every verification until restart
    keys.catch(() => cache.delete(issuer));
    entry = { at: Date.now(), keys };
    cache.set(issuer, entry);
  }
  return entry.keys;
}

export default function verifyEntry(options: AuthVerify): AuthEntry {
  const issuer = bare(options.issuer);
  const { audience } = options;
  // Standard is `aud`, but Clerk puts the authorized party in `azp` and
  // Cognito access tokens use `client_id`. The first one present is checked.
  const claimNames = toArray(options.audienceClaim ?? "aud");
  if (!audience) {
    throw new Error(
      "`issuer` needs an `audience`: one issuer serves many applications, " +
        "and without it a token minted for another one is accepted here.",
    );
  }
  const allowed = toArray(audience);

  return {
    name: `verify:${issuer}`,
    async user(ctx: Context) {
      const token = options.cookie
        ? ctx.cookies[options.cookie]
        : bearer(ctx);
      if (!token) return; // anonymous, not an error

      let claims: AuthClaims;
      try {
        claims = await check(token, issuer, allowed, claimNames);
      } catch (error) {
        // An unreachable issuer is an outage, not a bad credential: clearing
        // the cookie here would sign everyone out on a network blip
        if ((error as any)?.code === "AUTH_ISSUER_UNREACHABLE") throw error;
        // A stale or foreign cookie is just signed out, and cleared so it
        // stops arriving; their SDK re-issues a good one. A bad bearer token
        // was sent deliberately: 401.
        if (!options.cookie) throw error;
        clearOnSend(ctx, options.cookie);
        ctx.options.log?.message(
          "auth",
          `discarded a ${options.cookie} cookie that ${issuer} did not sign, or that has expired`,
        );
        return;
      }
      ctx.auth = meta(
        { iat: claims.iat ?? 0, exp: claims.exp, provider: issuer },
        options.cookie ? "cookie" : "jwt",
      );
      if (!options.getUser) return claims;
      return options.getUser(claims.sub, ctx);
    },
  };
}

// Signature, issuer, audience and expiry. Checking only the signature accepts
// any token that issuer ever minted, including one meant for another app.
async function check(
  token: string,
  issuer: string,
  allowed: readonly string[],
  claimNames: readonly string[],
) {
  const t = decodeJwt(token);
  if (!t) throw ServerError.AUTH_INVALID_TOKEN();
  const { head, body, sig, header, claims } = t;

  const algorithm = ALGS[header?.alg];
  if (!algorithm) throw ServerError.AUTH_INVALID_TOKEN(); // no `none`, no HS*
  let key = (await keysOf(issuer)).get(header.kid);
  if (!key) key = (await keysOf(issuer, true)).get(header.kid);
  if (!key) throw ServerError.AUTH_INVALID_TOKEN();

  const ok = await crypto.subtle.verify(
    algorithm.name === "ECDSA" ? { name: "ECDSA", hash: algorithm.hash } : algorithm,
    key,
    unb64url(sig),
    enc.encode(`${head}.${body}`),
  );
  if (!ok) throw ServerError.AUTH_INVALID_TOKEN();

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && now >= claims.exp) throw ServerError.AUTH_INVALID_TOKEN();
  if (claims.nbf && now < claims.nbf) throw ServerError.AUTH_INVALID_TOKEN();
  if (bare(claims.iss ?? "") !== issuer) throw ServerError.AUTH_INVALID_TOKEN();

  // Whichever of the configured claims this token actually carries
  const name = claimNames.find((one) => claims[one] !== undefined);
  if (!name) throw ServerError.AUTH_INVALID_TOKEN();
  const aud = toArray(claims[name]);
  if (!aud.some((one: string) => allowed.includes(one))) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return claims as AuthClaims;
}
