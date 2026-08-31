import ServerError from "../errors";
import { formatBytes, parseBytes } from "../util/bytes";

export const INF = Number.POSITIVE_INFINITY;

// Default cap on the bytes Server.js buffers in memory for a single request:
// JSON, text and url-encoded bodies, raw mode, and multipart *text* fields.
// Generous enough that normal JSON APIs never hit it; file bytes are exempt —
// they stream straight to `uploads` and are bounded by upload().limit() instead.
const DEFAULT_MAX = "1mb";

// `false` disables the limit; anything else (including undefined) resolves to a
// byte count, defaulting to DEFAULT_MAX.
export const resolveMax = (max: number | string | false | undefined): number =>
  max === false ? INF : parseBytes(max == null ? DEFAULT_MAX : max);

// A 413 naming the limit it hit.
export const tooLarge = (max: number) =>
  ServerError.BODY_TOO_LARGE({ limit: formatBytes(max) });
