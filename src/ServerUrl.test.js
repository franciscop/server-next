import ServerUrl from "./ServerUrl.js";

describe("getUrl()", () => {
  it("can parse a basic URL", () => {
    const url = new ServerUrl("https://example.com/");

    // Extended values
    expect(url.path).toEqual("/");
    expect(url.query).toEqual({});

    // Base values
    expect(url.href).toBe("https://example.com/");
    expect(url.pathname).toEqual("/");
    expect(url.protocol).toBe("https:");
    expect(url.username).toBe("");
    expect(url.password).toBe("");
    expect(url.host).toBe("example.com");
    expect(url.hostname).toBe("example.com");
    expect(url.port).toBe(null);
  });

  it("can parse localhost", () => {
    const url = new ServerUrl("http://localhost:3000/");

    // Extended values
    expect(url.path).toEqual("/");
    expect(url.query).toEqual({});
    expect(url.params).toEqual({});

    // Base values
    expect(url.href).toBe("http://localhost:3000/");
    expect(url.pathname).toEqual("/");
    expect(url.protocol).toBe("http:");
    expect(url.username).toBe("");
    expect(url.password).toBe("");
    expect(url.host).toBe("localhost:3000");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe(3000);
  });

  it("can be stringified", () => {
    const url = new ServerUrl("http://localhost:3000/");
    expect(url + "").toBe("http://localhost:3000/");
  });
});
