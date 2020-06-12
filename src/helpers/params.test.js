import params from "./params";

describe("helpers/params", () => {
  it("Does not match empty", () => {
    expect(params("/", "/")).toEqual({});
  });

  it("matches a single id", () => {
    expect(params("/:id", "/name")).toEqual({ id: "name" });
  });

  it("matches an empty string", () => {
    expect(params(false, "/name")).toEqual(false);
    expect(params("", "/name")).toEqual(false);
  });

  it("matches an asterix", () => {
    expect(params("/(.*)", "/name")).not.toEqual(false);
    expect(params("/(.*)", "/name")).toEqual({ 0: "name" });
  });

  it("does not match different depths", () => {
    expect(params("/abc/:id", "/name")).toEqual(false);
    expect(params("/:id/abc", "/name")).toEqual(false);
  });

  it("matches even with things before/afterwards", () => {
    expect(params("/abc/:id/def", "/abc/name/def")).toEqual({ id: "name" });
    expect(params("/:id/abc/def", "/name/abc/def")).toEqual({ id: "name" });
    expect(params("/abc/def/:id", "/abc/def/name")).toEqual({ id: "name" });
  });

  it("can match multiple parameters", () => {
    expect(params("/:id/:lang", "/name/español")).toEqual({
      id: "name",
      lang: "español",
    });
  });

  it("return an object for the same url", () => {
    expect(params("/abc", "/abc")).toEqual({});
  });
});
