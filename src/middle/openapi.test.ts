import { type } from "arktype";
import * as v from "valibot";
import { z } from "zod";
import server from "..";

const User = z.object({ name: z.string(), age: z.number() });

describe("openapi option", () => {
  it("openapi: true serves the spec at /openapi.json", async () => {
    const api = server({ openapi: true })
      .get("/users", { response: User }, () => [])
      .test();
    const res = await api.get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const spec = await res.json();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBeTruthy(); // package.json fallback
    expect(spec.paths["/users"].get.responses["200"]).toBeDefined();
    expect(spec.paths["/openapi.json"]).toBeUndefined(); // not self-documented
  });

  it("tags the built-in auth routes as auth", async () => {
    Object.assign(globalThis.env, { GITHUB_ID: "id", GITHUB_SECRET: "secret" });
    try {
      const api = server({
        openapi: true,
        auth: { strategy: "cookie", providers: ["github"] },
      }).test();
      const spec = await (await api.get("/openapi.json")).json();
      expect(spec.paths["/auth/logout"].post.tags).toEqual(["auth"]);
      expect(spec.paths["/auth/login/github"].get.tags).toEqual(["auth"]);
      expect(spec.paths["/auth/callback/github"].get.tags).toEqual(["auth"]);
    } finally {
      delete globalThis.env.GITHUB_ID;
      delete globalThis.env.GITHUB_SECRET;
    }
  });

  it("schema: false hides a route from the spec", async () => {
    const api = server({ openapi: true })
      .get("/", { schema: false }, () => "<html>home</html>")
      .get("/users", { response: User }, () => [])
      .test();
    const spec = await (await api.get("/openapi.json")).json();
    expect(spec.paths["/"]).toBeUndefined();
    expect(spec.paths["/users"]).toBeDefined();
    // The route itself still responds
    expect((await api.get("/")).status).toBe(200);
  });

  it("a string moves the spec path", async () => {
    const api = server({ openapi: "/api.json" })
      .get("/x", () => "ok")
      .test();
    expect((await api.get("/api.json")).status).toBe(200);
    expect((await api.get("/openapi.json")).status).toBe(404);
  });

  it("the object form overrides the package.json info", async () => {
    const api = server({
      openapi: { title: "My cool API", version: "2.1.0", description: "Neat" },
    })
      .get("/x", () => "ok")
      .test();
    const spec = await (await api.get("/openapi.json")).json();
    expect(spec.info).toEqual({
      title: "My cool API",
      version: "2.1.0",
      description: "Neat",
    });
  });

  it("only the schema metadata reaches the spec, never handler internals", async () => {
    const api = server({ openapi: true })
      .get("/books", function listAllBooks() {
        // @description Every book in the store
        return [];
      })
      .test();
    const spec = await (await api.get("/openapi.json")).json();
    const op = spec.paths["/books"].get;
    // No generated summary: viewers show the method + path on their own
    expect(op.summary).toBeUndefined();
    expect(op.description).toBeUndefined();
    expect(JSON.stringify(op)).not.toContain("listAllBooks");
    expect(JSON.stringify(op)).not.toContain("Every book");
  });

  it("route schemas and metadata land in the spec", async () => {
    const api = server({ openapi: true })
      .post(
        "/users",
        {
          body: User,
          response: User,
          schema: {
            tags: "users",
            title: "Create user",
            description: "Adds one",
          },
        },
        () => 201,
      )
      .test();
    const spec = await (await api.get("/openapi.json")).json();
    const op = spec.paths["/users"].post;
    expect(op.tags).toEqual(["users"]);
    expect(op.summary).toBe("Create user");
    expect(op.description).toBe("Adds one");
    expect(
      op.requestBody.content["application/json"].schema.properties.name,
    ).toEqual({ type: "string" });
  });

  it("query schemas become query parameters", async () => {
    const api = server({ openapi: true })
      .get(
        "/books",
        {
          query: z.object({ page: z.number(), search: z.string().optional() }),
        },
        () => [],
      )
      .test();
    const spec = await (await api.get("/openapi.json")).json();
    const params = spec.paths["/books"].get.parameters;
    expect(params).toContainEqual({
      name: "page",
      in: "query",
      required: true,
      schema: { type: "number" },
    });
    expect(params).toContainEqual({
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
    });
  });

  it("valibot and arktype schemas drive the spec too", async () => {
    // arktype's type-level API needs `strict` in the consumer's tsconfig
    // (this repo compiles without it), so its schema is runtime-only here
    const Posts = type({ page: "number", "search?": "string" } as never);
    const api = server({ openapi: true })
      .post(
        "/tags",
        { body: v.object({ label: v.string() }) }, // valibot
        () => 201,
      )
      .get("/posts", { query: Posts as never }, () => []) // arktype
      .test();
    const spec = await (await api.get("/openapi.json")).json();

    const body =
      spec.paths["/tags"].post.requestBody.content["application/json"].schema;
    expect(body.properties.label).toEqual({ type: "string" });
    expect(body.required).toEqual(["label"]);

    const params = spec.paths["/posts"].get.parameters;
    expect(params).toContainEqual({
      name: "page",
      in: "query",
      required: true,
      schema: { type: "number" },
    });
    expect(params).toContainEqual({
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
    });
  });

  it("off by default: no spec route", async () => {
    const api = server()
      .get("/x", () => "ok")
      .test();
    expect((await api.get("/openapi.json")).status).toBe(404);
  });

  it("a custom viewer route works alongside (the documented pattern)", async () => {
    const api = server({ openapi: true })
      .get(
        "/docs",
        () => `<!doctype html><script data-url="/openapi.json"></script>`,
      )
      .test();
    const docs = await api.get("/docs");
    expect(await docs.text()).toContain('data-url="/openapi.json"');
    expect((await api.get("/openapi.json")).status).toBe(200);
  });
});
