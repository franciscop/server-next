import type { Context } from "../types";
import { parse } from "../util/duration";

export type Cookie = {
  value?: string | null;
  path?: string;
  expires?: number | string | Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

const EXPIRED = new Date(0).toUTCString();

function normalizeExpires(
  expires: number | string | Date | null | undefined,
): string | undefined {
  // null or undefined → skip
  if (expires === null || expires === undefined) return undefined;

  // 0 → delete cookie
  if (expires === 0) return EXPIRED;

  // string → use as-is
  if (typeof expires === "string") {
    if (/^[\d._]+\w+$/.test(expires)) {
      // An unknown unit would otherwise expire the cookie on the spot
      const ms = parse(expires);
      if (ms === null)
        throw new Error(`Invalid cookie \`expires\`: "${expires}"`);
      return new Date(Date.now() + ms).toUTCString();
    } else {
      return expires;
    }
  }

  // number → relative ms from now
  if (typeof expires === "number") {
    return new Date(Date.now() + expires).toUTCString();
  }

  // Date → use UTC string
  if (expires instanceof Date) {
    return expires.toUTCString();
  }

  return undefined;
}

// The Set-Cookie that removes an auth cookie: Max-Age=0 on the root path and
// HttpOnly, matching how the auth cookies are set.
export const clearCookie = (name: string): string =>
  `${name}=; Path=/; Max-Age=0; HttpOnly`;

// A credential that can never verify again is cleared with the response.
// Kept off the public Context via a WeakMap (same pattern as the body source),
// so handlers never see it: auth schedules it, finalize() sends it.
const pendingClear = new WeakMap<object, string>();

// Any context will do, the socket upgrade's AuthContext included
export const clearOnSend = (ctx: object, name: string): void => {
  pendingClear.set(ctx, name);
};

export const toClear = (ctx: Context): string | undefined =>
  pendingClear.get(ctx);

// Takes an object and returns a string with the proper cookie values
export default function createCookies(key: string, val: Cookie): string {
  if (val.value === null) val.expires = EXPIRED;
  const { value, path, expires, maxAge, httpOnly, secure, sameSite } = val;

  // Encoded on write, decoded on read (parseCookies), so a value can hold the
  // characters that would otherwise end it (';', ',', '=') or break the reader
  // (a literal '%'). `??` keeps falsy values like 0 and false.
  let str = `${key}=${encodeURIComponent(value ?? "")};Path=${path || "/"}`;
  if (typeof expires !== "undefined")
    str += `;Expires=${normalizeExpires(expires)}`;
  if (typeof maxAge === "number") str += `;Max-Age=${maxAge}`;
  if (httpOnly) str += ";HttpOnly";
  if (secure) str += ";Secure";
  if (sameSite) str += `;SameSite=${sameSite}`;
  return str;
}
