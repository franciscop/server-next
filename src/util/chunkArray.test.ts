import chunkArray from "./chunkArray";

describe("chunkArray", () => {
  it("pairs up a flat [name, value, ...] list", () => {
    expect(chunkArray(["host", "a.com", "accept", "*/*"])).toEqual([
      ["host", "a.com"],
      ["accept", "*/*"],
    ]);
  });

  it("keeps a single pair", () => {
    expect(chunkArray(["host", "a.com"])).toEqual([["host", "a.com"]]);
  });

  // Node's rawHeaders exists to keep repeats apart, so they must survive
  it("keeps repeated names as separate pairs", () => {
    expect(chunkArray(["x-tag", "a", "x-tag", "b"])).toEqual([
      ["x-tag", "a"],
      ["x-tag", "b"],
    ]);
  });

  // A bare `GET / HTTP/1.0` carries no headers at all, and `new Headers()`
  // throws on a pair with no items in it
  it("gives no pairs for no headers", () => {
    expect(chunkArray([])).toEqual([]);
    expect(() => new Headers(chunkArray([]))).not.toThrow();
  });
});
