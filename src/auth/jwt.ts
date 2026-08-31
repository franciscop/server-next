// A minimal, dependency-free HS256 JWT (sign + verify) built on Web Crypto, so
// it works the same on Node, Bun, and the edge runtimes. Used by the `jwt` auth
// strategy to issue self-contained, signed session tokens.
import toArray from "../util/toArray";

const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64url = (data: string | Uint8Array): string => {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const unb64url = (seg: string): Uint8Array<ArrayBuffer> => {
  let b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

// The three raw segments plus the decoded header and claims, or null when the
// token is not even shaped like a JWT. Decoding only: nothing is verified.
export const decodeJwt = (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  try {
    return {
      head,
      body,
      sig,
      header: JSON.parse(dec.decode(unb64url(head))) as Record<string, any>,
      claims: JSON.parse(dec.decode(unb64url(body))) as Record<string, any>,
    };
  } catch {
    return null;
  }
};

const hmacKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

// Sign a payload as an HS256 JWT. `expires` is in seconds from now (optional).
export async function signJwt(
  payload: Record<string, any>,
  secret: string,
  expires?: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iat: now,
    ...(expires ? { exp: now + expires } : {}),
    ...payload,
  };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const data = `${head}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

// Verify an HS256 JWT; returns the payload, or null when the format, algorithm,
// signature, or expiry is invalid. Several secrets are tried in order, so a
// token signed with the previous key still verifies during a rotation.
export async function verifyJwt(
  token: string,
  secret: string | string[],
): Promise<Record<string, any> | null> {
  const t = decodeJwt(token);
  if (!t) return null;
  if (t.header?.alg !== "HS256") return null; // reject `none` / alg confusion

  let ok = false;
  for (const candidate of toArray(secret)) {
    const key = await hmacKey(candidate);
    ok = await crypto.subtle.verify(
      "HMAC",
      key,
      unb64url(t.sig),
      enc.encode(`${t.head}.${t.body}`),
    );
    if (ok) break;
  }
  if (!ok) return null;

  const payload = t.claims;
  if (payload?.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;
  return payload;
}
