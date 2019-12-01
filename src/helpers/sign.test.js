import { check, hash, sign } from "./sign";

describe("helpers/sign.js", () => {
  it("can hash things", async () => {
    expect(await hash("Hello world")).toBe(
      "c50d316a00f927059322a898ea2fa7321fdb4d32eb749656ea7ba7775a870dc0"
    );
  });

  it("can sign strings", async () => {
    expect(await sign("francisco", "123456")).toBe(
      "francisco#cc72290e44931616537934388d5c749b1bf9e63f9ff8701992534f8b0ded7923"
    );
  });

  it("can sign strings with pound symbols", async () => {
    expect(await sign("francisco#io", "123456")).toBe(
      "francisco#io#c8377bfa77a734e7b23097d397b6b36d8f593f9c2b8593fa73b9883a03f71559"
    );
  });

  it("can verify signatures", async () => {
    const secret = "123456";
    const signed = await sign("francisco", secret);
    expect(await check(signed, secret)).toEqual(true);
  });

  it("can sign values with pound symbols", async () => {
    const secret = "123456";
    const signed = await sign("francisco#io", secret);
    expect(await check(signed, secret)).toEqual(true);
  });

  it("requires a string", async () => {
    await expect(sign()).rejects.toEqual(expect.any(TypeError));
  });

  it("requires a secret at all", async () => {
    await expect(sign("francisco")).rejects.toEqual(expect.any(TypeError));
  });

  it("requires the same secret", async () => {
    const secret = "123456";
    const signed = await sign("francisco", secret);
    expect(await check(signed, secret + "7")).not.toEqual(true);
  });

  it("requires the same value", async () => {
    const secret = "123456";
    const signed = await sign("francisco", secret);
    expect(await check("a" + signed, secret)).not.toEqual(true);
  });

  it("requires the same hash", async () => {
    const secret = "123456";
    const signed = await sign("francisco", secret);
    expect(await check(signed + "a", secret)).not.toEqual(true);
  });
});
