import bodyKind from "./bodyKind";

describe("bodyKind", () => {
  it("reads the two form encodings", () => {
    expect(bodyKind("multipart/form-data; boundary=X")).toBe("multipart");
    expect(bodyKind("application/x-www-form-urlencoded")).toBe("form");
  });

  it("reads JSON, including any +json suffix", () => {
    expect(bodyKind("application/json")).toBe("json");
    expect(bodyKind("application/json; charset=utf-8")).toBe("json");
    expect(bodyKind("application/problem+json")).toBe("json");
    expect(bodyKind("application/vnd.api+json")).toBe("json");
  });

  it("treats text, and no type at all, as text", () => {
    expect(bodyKind("text/plain")).toBe("text");
    expect(bodyKind("text/csv; charset=utf-8")).toBe("text");
    expect(bodyKind("")).toBe("text");
    expect(bodyKind(undefined)).toBe("text");
  });

  it("ignores case and parameters", () => {
    expect(bodyKind("Multipart/Form-Data; boundary=X")).toBe("multipart");
    expect(bodyKind("APPLICATION/JSON")).toBe("json");
  });

  // Only the exact type or a real suffix: a lookalike is a file, not JSON
  it("does not mistake a lookalike for JSON", () => {
    expect(bodyKind("application/json5")).toBe("file");
    expect(bodyKind("application/jsonpatch")).toBe("file");
  });

  it("calls everything else a file", () => {
    expect(bodyKind("image/png")).toBe("file");
    expect(bodyKind("application/octet-stream")).toBe("file");
    expect(bodyKind("video/mp4")).toBe("file");
  });
});
