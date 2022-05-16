import pathPattern from "./pathPattern.js";

describe("pathPattern.js", () => {
  it("matches the same string", () => {
    expect(pathPattern("/hello", "/hello")).toEqual({});
    expect(pathPattern("/hello/world", "/hello/world")).toEqual({});
  });

  it("is trailing slash insensitive both ways", () => {
    expect(pathPattern("/hello", "/hello")).toEqual({});
    expect(pathPattern("/hello", "/hello/")).toEqual({});
    expect(pathPattern("/hello/", "/hello")).toEqual({});
    expect(pathPattern("/hello/", "/hello/")).toEqual({});

    expect(pathPattern("/hello/world", "/hello/world")).toEqual({});
    expect(pathPattern("/hello/world", "/hello/world/")).toEqual({});
    expect(pathPattern("/hello/world/", "/hello/world")).toEqual({});
    expect(pathPattern("/hello/world/", "/hello/world/")).toEqual({});
  });

  it("doesn't do partial matches", () => {
    expect(pathPattern("/hello", "/hello/John")).toEqual(false);
    expect(pathPattern("/hello/", "/hello/John")).toEqual(false);
  });

  it("can capture simple groups", () => {
    expect(pathPattern("/:hello", "/john")).toEqual({ hello: "john" });
    expect(pathPattern("/hello/:there", "/hello/john")).toEqual({
      there: "john",
    });
  });

  it("requires a part for the asterisk", () => {
    expect(pathPattern("/hello/:there/*", "/hello/John")).toEqual(false);
  });

  it("can make a part optional", () => {
    // expect(pathPattern("/:name?", "/")).toEqual({});
    expect(pathPattern("/hello/:name?", "/hello/")).toEqual({});
    expect(pathPattern("/:name?", "/john")).toEqual({ name: "john" });
    expect(pathPattern("/:name/*?", "/john")).toEqual({ name: "john" });
  });

  it("correctly matches the asterisk as an array of parts", () => {
    expect(pathPattern("/*", "/john")).toEqual({ "*": ["john"] });
    expect(pathPattern("/*", "/john/doe")).toEqual({ "*": ["john", "doe"] });
    expect(pathPattern("/*/*", "/john/doe")).toEqual({ "*": ["john", "doe"] });

    expect(pathPattern("/hello/*", "/hello/john")).toEqual({ "*": ["john"] });
    expect(pathPattern("/hello/*", "/hello/john/doe")).toEqual({
      "*": ["john", "doe"],
    });
    expect(pathPattern("/hello/*/*", "/hello/john/doe")).toEqual({
      "*": ["john", "doe"],
    });

    expect(pathPattern("/:name/*", "/john/doe")).toEqual({
      name: "john",
      "*": ["doe"],
    });

    expect(pathPattern("/:name/*", "/john/doe/derek")).toEqual({
      name: "john",
      "*": ["doe", "derek"],
    });

    expect(pathPattern("/:name/*/*", "/john/doe/derek")).toEqual({
      name: "john",
      "*": ["doe", "derek"],
    });
  });
});
