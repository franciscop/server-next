import ServerError from "../ServerError";
import type { AuthEntry, AuthVerify, Context } from "../types";

const enc = new TextEncoder();
const dec = new TextDecoder();

const unb64url = (seg: string): Uint8Array<ArrayBuffer> => {
  let b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

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
      const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const discovery = await fetch(url).then((r) => r.json());
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

const bearer = (ctx: Context): string | undefined => {
  const header = ctx.headers.authorization as string | undefined;
  if (!header) return;
  const [type, token] = header.trim().split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    throw ServerError.AUTH_INVALID_HEADER({ type });
  }
  return token;
};

export function entry(options: AuthVerify): AuthEntry {
  const { issuer, audience } = options;
  // Standard is `aud`, but Clerk puts the authorized party in `azp` and
  // Cognito access tokens use `client_id`. The first one present is checked.
  const claimNames = options.audienceClaim
    ? Array.isArray(options.audienceClaim)
      ? options.audienceClaim
      : [options.audienceClaim]
    : ["aud"];
  if (!audience) {
    throw new Error(
      "`issuer` needs an `audience`: one issuer serves many applications, " +
        "and without it a token minted for another one is accepted here.",
    );
  }
  const allowed = Array.isArray(audience) ? audience : [audience];

  return {
    name: `verify:${issuer}`,
    async user(ctx: Context) {
      const token = options.cookie
        ? ctx.cookies[options.cookie]
        : bearer(ctx);
      if (!token) return; // anonymous, not an error

      const claims = await check(token, issuer, allowed, claimNames);
      ctx.auth = {
        issuedAt: new Date((claims.iat ?? 0) * 1000),
        expiresAt: claims.exp ? new Date(claims.exp * 1000) : undefined,
        strategy: options.cookie ? "cookie" : "jwt",
        provider: issuer,
      };
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
  const parts = token.split(".");
  if (parts.length !== 3) throw ServerError.AUTH_INVALID_TOKEN();
  const [head, body, sig] = parts;

  let header: any;
  let claims: any;
  try {
    header = JSON.parse(dec.decode(unb64url(head)));
    claims = JSON.parse(dec.decode(unb64url(body)));
  } catch {
    throw ServerError.AUTH_INVALID_TOKEN();
  }

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
  if (claims.iss !== issuer) throw ServerError.AUTH_INVALID_TOKEN();

  // Whichever of the configured claims this token actually carries
  const name = claimNames.find((one) => claims[one] !== undefined);
  if (!name) throw ServerError.AUTH_INVALID_TOKEN();
  const value = claims[name];
  const aud = Array.isArray(value) ? value : [value];
  if (!aud.some((one: string) => allowed.includes(one))) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }
  return claims;
}
