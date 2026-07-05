import { signJwt, verifyJwt } from "./jwt";

const b64url = (o: unknown) =>
  btoa(JSON.stringify(o))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

describe("jwt (HS256)", () => {
  const secret = "test-secret";

  it("signs and verifies a roundtrip", async () => {
    const token = await signJwt({ sub: "123", role: "admin" }, secret);
    expect(token.split(".")).toHaveLength(3);
    const payload = await verifyJwt(token, secret);
    expect(payload).toMatchObject({ sub: "123", role: "admin" });
    expect(payload?.iat).toEqual(expect.any(Number));
  });

  it("rejects the wrong secret", async () => {
    const token = await signJwt({ sub: "123" }, secret);
    expect(await verifyJwt(token, "other-secret")).toBe(null);
  });

  it("rejects a tampered payload (signature no longer matches)", async () => {
    const token = await signJwt({ sub: "123" }, secret);
    const [head, , sig] = token.split(".");
    const forged = `${head}.${b64url({ sub: "evil" })}.${sig}`;
    expect(await verifyJwt(forged, secret)).toBe(null);
  });

  it("rejects an expired token", async () => {
    const token = await signJwt({ sub: "123" }, secret, -10); // exp 10s ago
    expect(await verifyJwt(token, secret)).toBe(null);
  });

  it("honors an unexpired exp", async () => {
    const token = await signJwt({ sub: "123" }, secret, 3600);
    expect(await verifyJwt(token, secret)).toMatchObject({ sub: "123" });
  });

  it("rejects malformed tokens", async () => {
    expect(await verifyJwt("only-one-part", secret)).toBe(null);
    expect(await verifyJwt("not.a.jwt", secret)).toBe(null);
  });

  it("rejects alg confusion (alg: none)", async () => {
    const forged = `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: "evil" })}.`;
    expect(await verifyJwt(forged, secret)).toBe(null);
  });
});
