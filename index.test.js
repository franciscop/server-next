import server from "./index.js";

// This effectively tests the reply, since it's the only thing unattended here
const engine = (handler, options = {}) => {
  // Handle any request from the mocker
  const mockAnyMethod = (target, method) => {
    if (method === "then") return target.then;
    if (target[method]) return target[method];
    return (path, extra) => handler({ path, method, headers: {}, options });
  };

  // To be able to dynamically mock methods
  return new Proxy({}, { get: mockAnyMethod });
};

describe("server", () => {
  it("is a function", () => {
    expect(server).toBeDefined();
    expect(typeof server).toBe("function");
  });

  it("can be run empty", async () => {
    // The native Node.js instance *must* be closed manually
    const instance = await server();
    await instance.close();
  });

  it("can return a plain string", async () => {
    const api = await server({ engine }, ctx => "Hello world");

    const { status, body, headers } = await api.get("/");
    expect(status).toEqual(200);
    expect(body).toBe("Hello world");
    expect(headers).toEqual({});
  });
});
