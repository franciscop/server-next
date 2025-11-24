import type { Cookie } from "../types";

const EXPIRED = new Date(0).toUTCString();
const times = /(-?(?:\d+\.?\d*|\d*\.?\d+)(?:e[-+]?\d+)?)\s*([\p{L}]*)/iu;

parse.millisecond = parse.ms = 0.001;
parse.second = parse.sec = parse.s = parse[""] = 1;
parse.minute = parse.min = parse.m = parse.s * 60;
parse.hour = parse.hr = parse.h = parse.m * 60;
parse.day = parse.d = parse.h * 24;
parse.week = parse.wk = parse.w = parse.d * 7;
parse.year = parse.yr = parse.y = parse.d * 365.25;
parse.month = parse.b = parse.y / 12;

// Returns the time in milliseconds
export function parse(str: string) {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return str;
  // ignore commas/placeholders
  str = str.toLowerCase().replace(/[,_]/g, "");
  const [_, value, units] = times.exec(str) || [];
  if (!units) return null;
  const unitValue = parse[units] || parse[units.replace(/s$/, "")];
  if (!unitValue) return null;
  const result = unitValue * parseFloat(value);
  return Math.abs(Math.round(result * 1000));
}

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
      return new Date(Date.now() + parse(expires)).toUTCString();
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

// Takes an object and returns a string with the proper cookie values
export default function createCookies(key: string, val: Cookie): string {
  if (val.value === null) val.expires = EXPIRED;
  const { value, path, expires } = val;
  const pathPart = `;Path=${path || "/"}`;
  const expiresStr = normalizeExpires(expires);
  const expiresPart =
    typeof expires !== "undefined" ? `;Expires=${expiresStr}` : "";
  return `${key}=${value || ""}${pathPart}${expiresPart}`;
}
