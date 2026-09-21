import type { TrustProxy } from "./security";

type Headers = Record<string, string | string[]>;

const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) || "";

// One address, comparable: no port, no brackets, no IPv4-mapped IPv6 prefix
export const normalize = (ip: string = ""): string =>
  ip
    .trim()
    .toLowerCase()
    .replace(/^\[(.+)\](:\d+)?$/, "$1") // [::1]:443 -> ::1
    .replace(/^::ffff:/, "") // IPv4-mapped IPv6
    .replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1"); // 1.2.3.4:5678 -> 1.2.3.4

// Addresses that cannot come from the public internet, so a peer using one is
// something on your own network: a proxy, a sidecar, a load balancer.
// 100.64/10 is carrier-grade NAT, which Fly.io and some balancers use.
const PRIVATE =
  /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

export const isPrivate = (raw: string): boolean => {
  const ip = normalize(raw);
  if (!ip) return false;
  if (PRIVATE.test(ip)) return true;
  // ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local
  return ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
};

// Whether the forwarding headers on this request can be believed. They are
// written by whoever connected to us, so the question is who that is: our own
// proxy, or the visitor themselves. Only the local network is our own.
export function isTrusted(peer: string, trustProxy: TrustProxy): boolean {
  return trustProxy === false ? false : isPrivate(peer);
}

// The visitor's address. Behind a trusted proxy the chain is oldest-first and
// every hop appends, so the rightmost public entry is the last address our own
// infrastructure saw: earlier entries are whatever the client chose to send.
export default function clientIp(
  headers: Headers,
  opts: {
    remoteAddress?: string;
    trustProxy?: TrustProxy;
    platformHeader?: string;
  } = {},
): string {
  const { remoteAddress = "", trustProxy = true, platformHeader } = opts;
  const peer = normalize(remoteAddress);

  // Serverless runtimes have no socket, so the platform's own header is the
  // only address there is. It is set by the edge, which is the only thing that
  // can reach us there.
  if (!peer && platformHeader) {
    const value = normalize(first(headers[platformHeader]));
    if (value) return value;
  }

  if (!isTrusted(peer, trustProxy)) return peer;

  // A CDN in front of your proxy: the chain's rightmost public hop is the
  // CDN's edge, so the visitor is whatever header the CDN writes instead.
  if (typeof trustProxy === "string") {
    return normalize(first(headers[trustProxy])) || peer;
  }

  const chain = first(headers["x-forwarded-for"])
    .split(",")
    .map(normalize)
    .filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isPrivate(chain[i])) return chain[i];
  }
  return peer;
}
