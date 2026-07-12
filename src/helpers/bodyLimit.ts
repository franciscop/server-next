import StatusError from "./StatusError";
import { parseBytes } from "./upload";

export const INF = Number.POSITIVE_INFINITY;

// Default cap on the bytes Server.js buffers in memory for a single request:
// JSON, text and url-encoded bodies, raw mode, and multipart *text* fields.
// Generous enough that normal JSON APIs never hit it; file bytes are exempt —
// they stream straight to `uploads` and are bounded by upload().limit() instead.
export const DEFAULT_MAX = "1mb";

// `false` disables the limit; anything else (including undefined) resolves to a
// byte count, defaulting to DEFAULT_MAX.
export const resolveMax = (max: number | string | false | undefined): number =>
  max === false ? INF : parseBytes(max == null ? DEFAULT_MAX : max);

const UNITS = ["b", "kb", "mb", "gb", "tb"];
function human(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `${bytes}`;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** i;
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${UNITS[i]}`;
}

// A 413 whose message tells the caller exactly how to fix it.
export const tooLarge = (max: number): StatusError =>
  new StatusError(
    `Request body exceeds the ${human(max)} limit. Raise it with ` +
      `body: { max: '10mb' } on the route or server, or set max: false to disable.`,
    413,
  );
