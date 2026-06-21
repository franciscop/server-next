import type { Context } from "../..";
import { cookies } from "../../reply";
import finishLogin from "../finishLogin";
import { checkState, clearState, startState } from "../state";

// https://developer.apple.com/documentation/sign_in_with_apple
const AUTHORIZE = "https://appleid.apple.com/auth/authorize";
const TOKEN = "https://appleid.apple.com/auth/token";

const b64url = (data: string | Uint8Array): string => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlJson = (segment: string): any => {
  let b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  // JWT segments are unpadded; atob needs the padding back
  b64 += "=".repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

// Apple's "client secret" is a short-lived ES256 JWT signed with your .p8 key.
// SubtleCrypto signs ECDSA as the raw r||s pair, which is exactly the JWS format
// (node:crypto would produce DER and need re-encoding), so this stays dep-free.
const clientSecret = async (): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" };
  const payload = {
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 3600,
    aud: "https://appleid.apple.com",
    sub: env.APPLE_ID,
  };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  const pem = String(env.APPLE_PRIVATE_KEY)
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${b64url(new Uint8Array(sig))}`;
};

const login = (ctx: Context) => {
  // crossSite: Apple's callback is a cross-site POST, so SameSite=None
  const { state, cookie } = startState(ctx, true);
  const params = new URLSearchParams({
    client_id: env.APPLE_ID,
    redirect_uri: `${ctx.url.origin}/auth/callback/apple`,
    response_type: "code",
    scope: "name email",
    // Requesting scopes forces Apple to POST the result back (form_post)
    response_mode: "form_post",
    state,
  });
  return cookies("oauth_state", cookie).redirect(`${AUTHORIZE}?${params}`);
};

const callback = async (ctx: Context) => {
  const body = (ctx.body || {}) as {
    code?: string;
    user?: string;
    state?: string;
  };
  checkState(ctx, body.state);

  const tokenRes = await fetch(TOKEN, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.APPLE_ID,
      client_secret: await clientSecret(),
      code: body.code,
      grant_type: "authorization_code",
      redirect_uri: `${ctx.url.origin}/auth/callback/apple`,
    }),
  });
  if (!tokenRes.ok) throw new Error("apple: token exchange failed");
  const token = await tokenRes.json();

  // Identity lives in the id_token (a JWT); Apple only sends the name on the
  // very first authorization, inside the form-posted `user` field.
  const claims = b64urlJson(token.id_token.split(".")[1]);
  let name: string | undefined;
  if (body.user) {
    const parsed = JSON.parse(body.user).name;
    if (parsed) name = `${parsed.firstName} ${parsed.lastName}`.trim();
  }

  const res = await finishLogin(ctx, {
    provider: "apple",
    key: claims.sub,
    email: claims.email,
    user: { id: claims.sub, name, email: claims.email },
  });
  res.headers.append("set-cookie", clearState());
  return res;
};

export default { login, callback };
