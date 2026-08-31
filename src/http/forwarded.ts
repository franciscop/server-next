type Headers = Record<string, string | string[]>;

// A proxy that terminates TLS forwards plain HTTP, so the scheme and host on
// the wire are not the ones the visitor used. These headers carry the
// originals, and `trustProxy` decides whether to believe them: an app exposed
// directly to the internet must not, since anyone can send them.
//
// When proxies chain, each appends, so the value is a comma-separated list
// oldest-first. The visitor's own hop is the leftmost one; trusting the last
// would let an inner hop (or a client) claim whatever it likes.
const first = (value: string | string[] | undefined): string | undefined => {
  const one = Array.isArray(value) ? value[0] : value;
  return one?.split(",")[0].trim() || undefined;
};

// Rewrites the origin of an already-built URL, leaving the path and query
// exactly as they are.
export default function forwarded(
  url: URL,
  headers: Headers,
  trustProxy: boolean,
): void {
  if (!trustProxy) return;

  const proto = first(headers["x-forwarded-proto"]);
  if (proto === "http" || proto === "https") url.protocol = `${proto}:`;

  const host = first(headers["x-forwarded-host"]);
  const port = first(headers["x-forwarded-port"]);

  if (host?.includes(":")) {
    // Carries its own port, which is the more specific value
    url.host = host;
  } else if (host) {
    // Setting `host` without a port leaves the old one in place, so the port
    // is set explicitly: the forwarded one, or the scheme's default
    url.hostname = host;
    url.port = port ?? "";
  } else if (port) {
    url.port = port;
  }
}
