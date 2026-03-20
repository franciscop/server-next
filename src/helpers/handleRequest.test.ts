import server, { ServerError } from "..";

describe("handleRequest onError", () => {
  it("calls onError when an error is thrown", async () => {
    const onError = jest.fn(
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
    const onError = jest.fn(() => new Response("Not found!", { status: 404 }));

    const res = await server({ onError })
      .get("/other", () => 200)
      .test()
      .get("/");

    expect(onError).toHaveBeenCalled();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found!");
  });

  it("uses default error handler when onError is not provided", async () => {
    const res = await server()
      .get("/", () => {
        throw new Error("Default error");
      })
      .test()
      .get("/");

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Default error");
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
    const onError = jest.fn((error) => {
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
    const onError = jest.fn(
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
    const onError = jest.fn((error) => {
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
