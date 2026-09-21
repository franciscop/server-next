import type { Context, Server } from "..";
import type { BodySource } from "../body/body";
import { setBodySource } from "../body/body";
import clientIp, { isTrusted, normalize } from "../http/clientIp";
import define from "../util/define";
import forwarded from "../http/forwarded";
import parseCookies from "../http/parseCookies";
import parseHeaders from "../http/parseHeaders";

// Runtimes with no socket: the edge is the only thing that can reach the app,
// so the header it sets is the client address. Read only on that platform,
// since anywhere else the same header is just something a client sent.
const PLATFORM_IP: Record<string, string> = {
  cloudflare: "cf-connecting-ip",
  netlify: "x-nf-client-connection-ip",
};

// The five things a runtime adapter must provide; everything else about
// building a Context is shared and lives here.
type ContextParts = {
  method: string;
  headers: Headers;
  // Absolute URL, as the wire saw it; forwarded() rewrites it below
  url: string;
  signal: AbortSignal;
  remoteAddress: string;
  source: BodySource;
};

export default function createContext(
  app: Server,
  {
    method: rawMethod,
    headers: rawHeaders,
    url: rawUrl,
    signal,
    remoteAddress,
    source,
  }: ContextParts,
): Context {
  const init = performance.now();

  // An unknown method is not rejected here: handleRequest throws inside its
  // error boundary, so the 405 goes through onError and finalize like any error
  const method = rawMethod?.toLowerCase() || "get";

  const headers = parseHeaders(rawHeaders);
  const cookies = parseCookies(headers.cookie);

  const url = new URL(rawUrl.replace(/\/$/, "")) as Context["url"];
  // A TLS-terminating proxy forwards plain HTTP, so the wire scheme and host
  // are not the visitor's. Every consumer of ctx.url depends on this being
  // right: absolute links, redirects, and the OAuth redirect_uri.
  // One decision for the whole request: whoever connected either is our proxy
  // or is not, and that settles ctx.ip and ctx.url alike.
  const { trustProxy } = app.settings.security;
  const platformHeader = PLATFORM_IP[app.platform.provider ?? ""];
  forwarded(url, headers, isTrusted(normalize(remoteAddress), trustProxy));
  define(url, "query", (url: URL) =>
    Object.fromEntries(url.searchParams.entries()),
  );

  const ctx: Context = {
    options: app.settings,
    platform: app.platform,
    url,
    // Possibly not a real Method: handleRequest rejects it inside its boundary
    method: method as Context["method"],
    body: undefined,
    headers,
    cookies,
    signal,
    init,
    app,
    ip: clientIp(headers, { remoteAddress, trustProxy, platformHeader }),
  };
  // The body is not read yet: handleRequest resolves it once the route (and
  // its `parser` mode) is known, so a `stream` route never buffers
  setBodySource(ctx, source);
  return ctx;
}
