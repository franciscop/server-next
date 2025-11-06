import pathPattern from "./pathPattern.js";

describe("pathPattern.js", () => {
  it("matches the same string", () => {
    expect(pathPattern("/", "/hello")).toEqual(null);
    expect(pathPattern("/hello", "/")).toEqual(null);
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
    expect(pathPattern("/hello", "/hello/John")).toEqual(null);
    expect(pathPattern("/hello/", "/hello/John")).toEqual(null);
  });

  it("can capture simple params", () => {
    expect(pathPattern("/:hello", "/john")).toEqual({ hello: "john" });
    expect(pathPattern("/hello/:there", "/hello/john")).toEqual({
      there: "john",
    });
  });

  it("will parse the params as numbers", () => {
    expect(pathPattern("/:id(number)", "/25")).toEqual({ id: 25 });
    expect(pathPattern("/:id(number)", "/25.5")).toEqual({ id: 25.5 });
    expect(pathPattern("/users/:id(number)", "/users/25")).toEqual({
      id: 25,
    });

    expect(pathPattern("/:id(date)", "/2015-01-01")).toEqual({
      id: new Date("2015-01-01"),
    });
    expect(pathPattern("/report/:id(date)", "/report/2015-01-01")).toEqual({
      id: new Date("2015-01-01"),
    });
  });

  it("will still match, but not parse it if it's an invalid number", () => {
    expect(pathPattern("/:id(number)", "/hi")).toEqual({});
    expect(pathPattern("/users/:id(number)", "/users/hi")).toEqual({});
  });

  it("requires a part for the asterisk", () => {
    expect(pathPattern("/hello/:there/*", "/hello/John")).toEqual(null);
  });

  it("can make a part optional", () => {
    expect(pathPattern("/:name?", "/")).toEqual({});
    expect(pathPattern("/hello/:name?", "/hello/")).toEqual({});
    expect(pathPattern("/:id(number)?", "/")).toEqual({});
    expect(pathPattern("/:id(date)?", "/")).toEqual({});
    expect(pathPattern("/:id(number)?", "/25")).toEqual({ id: 25 });
    expect(pathPattern("/:id(date)?", "/2015-01-01")).toEqual({
      id: new Date("2015-01-01"),
    });

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
