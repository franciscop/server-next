import parseRange from "./parseRange";

describe("parseRange", () => {
  const size = 1000;

  it("no header -> full body", () => {
    expect(parseRange(undefined, size)).toBe(null);
  });

  it("malformed / multi-range -> full body", () => {
    expect(parseRange("bytes=abc", size)).toBe(null);
    expect(parseRange("bytes=0-10,20-30", size)).toBe(null);
    expect(parseRange("bytes=-", size)).toBe(null);
  });

  it("closed range", () => {
    expect(parseRange("bytes=0-499", size)).toEqual({ start: 0, end: 499 });
  });

  it("open-ended range (to the end)", () => {
    expect(parseRange("bytes=500-", size)).toEqual({ start: 500, end: 999 });
  });

  it("suffix range (last N bytes)", () => {
    expect(parseRange("bytes=-100", size)).toEqual({ start: 900, end: 999 });
  });

  it("suffix larger than the file clamps to the whole file", () => {
    expect(parseRange("bytes=-5000", size)).toEqual({ start: 0, end: 999 });
  });

  it("end past the file clamps to the last byte", () => {
    expect(parseRange("bytes=0-99999", size)).toEqual({ start: 0, end: 999 });
  });

  it("start past the file -> unsatisfiable", () => {
    expect(parseRange("bytes=1000-", size)).toBe("unsatisfiable");
    expect(parseRange("bytes=5000-6000", size)).toBe("unsatisfiable");
  });

  it("any range on an empty file -> unsatisfiable", () => {
    expect(parseRange("bytes=0-0", 0)).toBe("unsatisfiable");
  });
});
