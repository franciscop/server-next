import type { Context, Server } from "..";
import type { BodySource } from "../body/body";
import { setBodySource } from "../body/body";
import clientIp from "../http/clientIp";
import define from "../util/define";
import forwarded from "../http/forwarded";
import parseCookies from "../http/parseCookies";
import parseHeaders from "../http/parseHeaders";

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
  { method: rawMethod, headers: rawHeaders, url: rawUrl, signal, remoteAddress, source }: ContextParts,
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
  forwarded(url, headers, app.settings.security.trustProxy);
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
    ip: clientIp(headers, {
      remoteAddress,
      trustProxy: app.settings.security.trustProxy,
    }),
  };
  // The body is not read yet: handleRequest resolves it once the route (and
  // its `parser` mode) is known, so a `stream` route never buffers
  setBodySource(ctx, source);
  return ctx;
}
