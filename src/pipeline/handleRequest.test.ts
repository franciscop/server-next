import { describe, expect, it, mock } from "bun:test";
import server, { ServerError } from "..";

describe("the second fetch argument", () => {
  it("does not merge Bun's server object into the process env", async () => {
    const app = server({ log: false }).get("/", (ctx) => ctx.ip);
    const bunServer = {
      requestIP: () => ({ address: "10.1.2.3" }),
      upgrade: () => false,
    };
    const res = await app.fetch(new Request("http://localhost/"), bunServer as any);
    // The server object still works as the IP source...
    expect(await res.text()).toBe("10.1.2.3");
    // ...but none of its functions leak into the global env
    expect((globalThis.env as any).requestIP).toBeUndefined();
    expect(typeof (globalThis.env as any).upgrade).not.toBe("function");
  });

  it("merges worker-style env vars", async () => {
    const app = server({ log: false }).get("/", () => "hi");
    await app.fetch(new Request("http://localhost/"), { MY_TEST_VAR: "yes" } as any);
    expect(globalThis.env.MY_TEST_VAR).toBe("yes");
    delete (globalThis.env as any).MY_TEST_VAR;
  });
});

describe("unknown HTTP methods", () => {
  it("answers 405 through onError instead of throwing out of fetch()", async () => {
    const app = server({ log: false }).get("/", () => "hi");
    const res = await app.fetch(
      new Request("http://localhost/", { method: "PROPFIND" }),
    );
    expect(res.status).toBe(405);
    expect(await res.text()).toContain("propfind");
  });

  it("finalizes the 405 like any response (CORS headers included)", async () => {
    const app = server({ log: false, cors: true }).get("/", () => "hi");
    const res = await app.fetch(
      new Request("http://localhost/", {
        method: "PROPFIND",
        headers: { origin: "https://example.com" },
      }),
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example.com",
    );
  });

  it("reaches a custom onError with the METHOD_NOT_ALLOWED code", async () => {
    const onError = mock((error: any) =>
      new Response(error.code, { status: error.status }),
    );
    const app = server({ log: false, onError }).get("/", () => "hi");
    const res = await app.fetch(
      new Request("http://localhost/", { method: "PROPFIND" }),
    );
    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(405);
    expect(await res.text()).toBe("METHOD_NOT_ALLOWED");
  });
});

describe("handleRequest onError", () => {
  it("calls onError when an error is thrown", async () => {
    const onError = mock(
      () => new Response("Custom error", { status: 418 }),
    );

    const res = await server({ onError })
      .get("/", () => {
        throw new Error("Something went wrong");
      })
      .test()
      .get("/");

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(418);
    expect(await res.text()).toBe("Custom error");
  });

  it("calls onError with ServerError for 404", async () => {
    const onError = mock(() => new Response("Not found!", { status: 404 }));

    const res = await server({ onError })
      .get("/other", () => 200)
      .test()
      .get("/");

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found!");
  });

  // A message a handler threw is written for the developer, and can carry
  // anything (a connection string, a query). It never becomes the response.
  it("keeps a thrown message out of the response", async () => {
    const logged: string[] = [];
    const realError = console.error;
    console.error = (...args: any[]) => logged.push(args.join(" "));
    const res = await server()
      .get("/", () => {
        throw new Error("db://admin:hunter2@10.0.0.5/prod");
      })
      .test()
      .get("/");
    console.error = realError;

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Server Error");
    // ...and the operator still gets it
    expect(logged.join(" ")).toContain("hunter2");
  });

  it("uses default error handler for 404 when onError is not provided", async () => {
    const res = await server()
      .get("/other", () => 200)
      .test()
      .get("/");

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });

  it("calls onError with correct error status", async () => {
    const onError = mock((error) => {
      return new Response(`Error ${error.status}: ${error.message}`, {
        status: error.status || 500,
      });
    });

    const res = await server({ onError })
      .get("/", () => {
        throw new ServerError("BAD_REQUEST", 400, "Invalid input");
      })
      .test()
      .get("/");

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Error 400: Invalid input");
  });

  it("allows onError to return different status than original error", async () => {
    const onError = mock(
      () => new Response("Logged and sanitized", { status: 200 }),
    );

    const res = await server({ onError })
      .get("/", () => {
        throw new ServerError("INTERNAL", 500, "Sensitive error details");
      })
      .test()
      .get("/");

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Logged and sanitized");
  });

  it("allows onError to return JSON error response", async () => {
    const onError = mock((error) => {
      return new Response(
        JSON.stringify({
          error: {
            code: error.code || "UNKNOWN",
            message: error.message,
            status: error.status || 500,
          },
        }),
        {
          status: error.status || 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const res = await server({ onError })
      .get("/", () => {
        throw new ServerError("VALIDATION_ERROR", 422, "Invalid data format");
      })
      .test()
      .get("/");

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(422);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid data format",
        status: 422,
      },
    });
  });
});
