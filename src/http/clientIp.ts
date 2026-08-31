type Headers = Record<string, string | string[]>;

const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) || "";

// Strip the IPv4-mapped IPv6 prefix so addresses read as plain IPv4
const normalize = (ip: string): string => ip.replace(/^::ffff:/, "");

// Resolve the real client IP. Platform-set headers (Cloudflare, Netlify) are
// always trusted since the edge overwrites them on the way in; X-Forwarded-For
// and X-Real-IP are only trusted when `trustProxy` is on, otherwise a client
// could spoof their IP by sending the header themselves.
export default function clientIp(
  headers: Headers,
  opts: { remoteAddress?: string; trustProxy?: boolean } = {},
): string {
  const { remoteAddress = "", trustProxy = false } = opts;

  const cf = first(headers["cf-connecting-ip"]);
  if (cf) return normalize(cf);
  const nf = first(headers["x-nf-client-connection-ip"]);
  if (nf) return normalize(nf);

  if (trustProxy) {
    const xff = first(headers["x-forwarded-for"]);
    if (xff) return normalize(xff.split(",")[0].trim());
    const real = first(headers["x-real-ip"]);
    if (real) return normalize(real);
  }

  return normalize(remoteAddress);
}
