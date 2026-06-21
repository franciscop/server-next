import type { Context, Logger, LogLevel } from "..";
import color from "./color";

// Minimal status-code → text map for the request log line. Unknown codes just
// show the number, which keeps this dependency-free and runtime-agnostic.
const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

const UNITS = ["b", "kb", "mb", "gb", "tb"];

// 0 → "0b", 5 → "5b", 1024 → "1kb", 10240 → "10kb", 1536 → "1.5kb"
function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0b";
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** i;
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${UNITS[i]}`;
}

// A distinct color per log scope so the lines are easy to scan
const SCOPE_COLORS: Record<string, string> = {
  start: "green",
  api: "cyan",
};
const MODULE_COLOR = "magenta";

// Wrap text in a color without running the color parser over `text` itself,
// which may contain braces, paths, arrows, etc.
const paint = (name: string, text: string): string =>
  `${color(`{${name}}`)}${text}${color("{/}")}`;

// Creates the logger held in `settings.log`. With no level (the default), every
// method is a no-op, so call sites never need to branch.
export default function createLogger(level?: LogLevel): Logger {
  const enabled = !!level;

  const message = (scope: string, msg: string) => {
    if (!enabled) return;
    const c = SCOPE_COLORS[scope] || MODULE_COLOR;
    console.log(paint(c, `[server:${scope}] ${msg}`));
  };

  const request = (ctx: Context, res: Response) => {
    if (!enabled) return;
    const method = ctx.method.toUpperCase();
    const path = ctx.url.pathname;
    const reqLen = Number(ctx.headers["content-length"]) || 0;
    const resLen = Number(res.headers.get("content-length")) || 0;
    const status = res.status;
    const text = STATUS_TEXT[status] || "";

    const reqSize = reqLen ? ` ${formatBytes(reqLen)}` : "";
    const resSize = resLen ? ` ${formatBytes(resLen)}` : "";
    let line = `${method} ${path}${reqSize} → ${status}${text ? ` ${text}` : ""}${resSize}`;

    // Surface the redirect target so 3xx responses are self-explanatory
    const location = res.headers.get("location");
    if (location) line += ` → ${location}`;

    message("api", line);
  };

  return {
    level,
    message,
    start: (url: string) => message("start", url),
    request,
  };
}
