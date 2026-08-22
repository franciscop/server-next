// A local OIDC issuer for tests: its own RSA key pair, its own discovery
// document and JWKS endpoint, served by intercepting fetch. No dependencies,
// so the whole hosted-auth path runs with no vendor and no network.
const enc = new TextEncoder();

const b64url = (data: string | Uint8Array): string => {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export async function signRS256(
  key: CryptoKeyPair,
  claims: Record<string, any>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "a42" }));
  const body = b64url(JSON.stringify({ iat: now, exp: now + 300, ...claims }));
  const data = `${head}.${body}`;
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key.privateKey,
    enc.encode(data),
  );
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

const intercepted = new Map<string, () => any>();
let realFetch: typeof fetch | undefined;

export async function testIssuer(origin: string, serve = true) {
  const key = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  if (serve) {
    const jwk = await crypto.subtle.exportKey("jwk", key.publicKey);
    intercepted.set(`${origin}/.well-known/openid-configuration`, () => ({
      issuer: origin,
      // Deliberately not "jwks.json": the path is arbitrary, only discovery
      // is universal
      jwks_uri: `${origin}/oauth2/v3/certs`,
      authorization_endpoint: `${origin}/authorize`,
      token_endpoint: `${origin}/token`,
    }));
    intercepted.set(`${origin}/oauth2/v3/certs`, () => ({
      keys: [{ ...jwk, kid: "a42", alg: "RS256", use: "sig" }],
    }));

    if (!realFetch) {
      realFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any, opts: any) => {
        const answer = intercepted.get(String(url));
        if (answer) return Response.json(answer());
        return realFetch!(url, opts);
      }) as typeof fetch;
    }
  }

  return {
    key,
    restore: () => {
      if (realFetch) globalThis.fetch = realFetch;
      realFetch = undefined;
      intercepted.clear();
    },
  };
}
