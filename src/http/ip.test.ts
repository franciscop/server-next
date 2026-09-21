import server from "../index";
import clientIp from "./clientIp";

// A server that echoes the derived client IP back as text. `.test()` connects
// from loopback, so forwarding headers are trusted the way they are behind a
// real proxy; `peer()` below exercises the addresses a test cannot fake.
const ipServer = (options = {}) =>
  server(options)
    .get("/", (ctx) => ctx.ip)
    .test();

const peer = (
  remoteAddress: string,
  headers: Record<string, string> = {},
  trustProxy: any = true,
) => clientIp(headers, { remoteAddress, trustProxy });

describe("ctx.ip", () => {
  it("uses the peer when nothing is forwarded", async () => {
    expect(await (await ipServer().get("/")).text()).toBe("127.0.0.1");
  });

  it("takes the forwarded address behind a proxy", async () => {
    const res = await ipServer().get("/", {
      headers: { "x-forwarded-for": "85.1.1.1" },
    });
    expect(await res.text()).toBe("85.1.1.1");
  });

  it("ignores forwarding headers when trustProxy is false", async () => {
    const res = await ipServer({ security: { trustProxy: false } }).get("/", {
      headers: { "x-forwarded-for": "85.1.1.1" },
    });
    expect(await res.text()).toBe("127.0.0.1");
  });
});

describe("who is trusted", () => {
  it("ignores what a public peer forwards", () => {
    expect(peer("203.0.113.9", { "x-forwarded-for": "1.2.3.4" })).toBe(
      "203.0.113.9",
    );
  });

  it("believes a private peer", () => {
    expect(peer("10.0.0.2", { "x-forwarded-for": "85.1.1.1" })).toBe(
      "85.1.1.1",
    );
  });

  // The client sent its own value and the proxy appended the real one, so the
  // leftmost entry is whatever the client chose to claim
  it("takes the last public hop, not the client's claim", () => {
    expect(peer("10.0.0.2", { "x-forwarded-for": "1.2.3.4, 85.1.1.1" })).toBe(
      "85.1.1.1",
    );
  });

  it("looks past your own proxies at the end of the chain", () => {
    expect(peer("10.0.0.2", { "x-forwarded-for": "85.1.1.1, 10.0.0.5" })).toBe(
      "85.1.1.1",
    );
  });

  it("falls back to the peer with no chain, or an all-private one", () => {
    expect(peer("10.0.0.2")).toBe("10.0.0.2");
    expect(
      peer("10.0.0.2", { "x-forwarded-for": "10.0.0.5, 192.168.1.4" }),
    ).toBe("10.0.0.2");
  });

  it("reads an IPv4-mapped Docker peer as private", () => {
    expect(peer("::ffff:172.18.0.3", { "x-forwarded-for": "85.1.1.1" })).toBe(
      "85.1.1.1",
    );
  });

  it("reads carrier-grade NAT as private", () => {
    expect(peer("100.64.0.7", { "x-forwarded-for": "85.1.1.1" })).toBe(
      "85.1.1.1",
    );
  });

  // `true` is the default, and it still means "from my own network only"
  it("does not widen who is trusted when set to true", () => {
    const headers = { "x-forwarded-for": "85.1.1.1" };
    expect(peer("203.0.113.9", headers, true)).toBe("203.0.113.9");
    expect(peer("10.0.0.2", headers, true)).toBe("85.1.1.1");
  });
});

// A CDN in front of your own proxy: the chain's last public hop is the CDN's
// edge, so the visitor is whatever header the CDN writes.
describe("a header name instead of the chain", () => {
  const headers = {
    "cf-connecting-ip": "85.1.1.1",
    "x-forwarded-for": "85.1.1.1, 172.71.0.9",
  };

  it("reads the named header from a private peer", () => {
    expect(peer("10.0.0.2", headers, "cf-connecting-ip")).toBe("85.1.1.1");
  });

  it("ignores it from a public peer", () => {
    expect(peer("203.0.113.9", headers, "cf-connecting-ip")).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to the peer when the header is absent", () => {
    expect(peer("10.0.0.2", {}, "cf-connecting-ip")).toBe("10.0.0.2");
  });
});

// Off Cloudflare, cf-connecting-ip is just a header a client can send
describe("platform headers", () => {
  it("are not read on an ordinary runtime", () => {
    expect(peer("10.0.0.2", { "cf-connecting-ip": "9.9.9.9" })).toBe(
      "10.0.0.2",
    );
  });

  it("are read when there is no socket to read instead", () => {
    const ip = clientIp(
      { "cf-connecting-ip": "85.1.1.1" },
      { remoteAddress: "", platformHeader: "cf-connecting-ip" },
    );
    expect(ip).toBe("85.1.1.1");
  });
});

describe("x-real-ip", () => {
  it("is no longer honoured on its own", () => {
    expect(peer("10.0.0.2", { "x-real-ip": "9.9.9.9" })).toBe("10.0.0.2");
  });

  it("works when named explicitly", () => {
    expect(peer("10.0.0.2", { "x-real-ip": "85.1.1.1" }, "x-real-ip")).toBe(
      "85.1.1.1",
    );
  });
});
