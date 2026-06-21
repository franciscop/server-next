import server from "..";

const origin = "http://localhost:3000/";

describe("cors", () => {
  it("can simply enable the cors", async () => {
    const cors = "*";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });

    expect(headers.get("access-control-allow-origin")).toBe("*");
    expect(headers.get("access-control-allow-headers")).toBe("*");
    expect(headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
    );
  });

  it("can disable the cors", async () => {
    const cors = false;
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    expect(headers.get("access-control-allow-origin")).toBe(null);
  });

  it("gets the wildcard without the origin", async () => {
    const cors = "*";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/");
    expect(headers.get("access-control-allow-origin")).toBe("*");
  });

  it("gets the origin with true", async () => {
    const cors = true;
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    expect(headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("gets the correct origin with multiple as string", async () => {
    const cors = "https://a.com/,https://b.com/";
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://b.com/" } });
    expect(headers.get("access-control-allow-origin")).toBe("https://b.com/");
  });

  it("gets the correct origin with multiple as array", async () => {
    const cors = ["https://a.com/", "https://b.com/"];
    const { headers } = await server({ cors })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://b.com/" } });
    expect(headers.get("access-control-allow-origin")).toBe("https://b.com/");
  });

  it("omits CORS headers for a disallowed origin", async () => {
    const { headers } = await server({ cors: "https://allowed.com" })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin: "https://evil.com" } });
    expect(headers.get("access-control-allow-origin")).toBe(null);
  });

  it("reflects the origin and sets credentials (no wildcard)", async () => {
    const { headers } = await server({
      cors: { origin: "*", credentials: true },
    })
      .get("/", () => 200)
      .test()
      .get("/", { headers: { origin } });
    // With credentials the "*" wildcard is forbidden, so the origin is echoed
    expect(headers.get("access-control-allow-origin")).toBe(origin);
    expect(headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("auto-handles the preflight OPTIONS request", async () => {
    const res = await server({ cors: "*" })
      .post("/users", () => 201)
      .test()
      .options("/users", {
        headers: { origin, "access-control-request-method": "POST" },
      });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-max-age")).toBe("86400");
  });

  it("adds CORS headers to error (404) responses", async () => {
    const res = await server({ cors: "*" })
      .get("/", () => 200)
      .test()
      .get("/missing", { headers: { origin } });
    expect(res.status).toBe(404);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("lets a user-defined OPTIONS route win over the preflight", async () => {
    const res = await server({ cors: "*" })
      .options("/custom", () => "custom")
      .test()
      .options("/custom", {
        headers: { origin, "access-control-request-method": "POST" },
      });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("custom");
    // CORS headers are still applied on top of the user's own response
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
