import { type } from "arktype";
import * as v from "valibot";
import { z } from "zod";
import server, { ValidationError, type StandardSchemaV1 } from ".";

// Any object with `~standard` is a Standard Schema; these stubs prove the
// protocol alone is enough, with no library involved.
const stub = (validate: (value: any) => any): StandardSchemaV1<any, any> => ({
  "~standard": { version: 1 as const, vendor: "test", validate },
});

// Requires `field` to be a string; returns the validated value untouched
const requires = (field: string) =>
  stub((value: any) =>
    typeof value?.[field] === "string"
      ? { value }
      : { issues: [{ message: "Expected a string", path: [field] }] },
  );

describe("request validation", () => {
  it("passes a valid body through to the handler", async () => {
    const app = server().post("/", { body: requires("name") }, (ctx) => ctx.body);
    const res = await app.test().post("/", { name: "Ada" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "Ada" });
  });

  it("assigns the validated output back, so transforms apply", async () => {
    const upper = stub((value: any) => ({
      value: { name: String(value.name).toUpperCase() },
    }));
    const app = server().post("/", { body: upper }, (ctx) => ctx.body);
    expect(await (await app.test().post("/", { name: "ada" })).json()).toEqual({
      name: "ADA",
    });
  });

  it("responds 422 to an invalid body, without leaking the field", async () => {
    const app = server().post("/", { body: requires("password") }, () => 200);
    const res = await app.test().post("/", { password: 42 });
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(text).not.toContain("password");
    expect(text).not.toContain("Expected");
    expect(text).toContain("Invalid request");
  });

  it("validates and replaces the query", async () => {
    const paged = stub((value: any) =>
      value.page
        ? { value: { page: Number(value.page) } }
        : { issues: [{ message: "Missing", path: ["page"] }] },
    );
    const app = server().get("/", { query: paged }, (ctx) => ({
      page: ctx.url.query.page,
    }));
    expect(await (await app.test().get("/?page=2")).json()).toEqual({ page: 2 });
    expect((await app.test().get("/")).status).toBe(422);
  });

  it("validates and replaces the params", async () => {
    const numeric = stub((value: any) =>
      /^\d+$/.test(value.id)
        ? { value: { id: Number(value.id) } }
        : { issues: [{ message: "Not a number", path: ["id"] }] },
    );
    const app = server().get("/users/:id", { params: numeric }, (ctx) => ({
      id: ctx.url.params.id,
    }));
    expect(await (await app.test().get("/users/42")).json()).toEqual({ id: 42 });
    expect((await app.test().get("/users/ada")).status).toBe(422);
  });

  it("awaits an async schema", async () => {
    const slow = stub(async (value: any) => {
      await new Promise((done) => setTimeout(done, 5));
      return value.ok
        ? { value }
        : { issues: [{ message: "Not ok", path: ["ok"] }] };
    });
    const app = server().post("/", { body: slow }, () => 201);
    expect((await app.test().post("/", { ok: true })).status).toBe(201);
    expect((await app.test().post("/", {})).status).toBe(422);
  });

  it("leaves everything untouched without schemas", async () => {
    const app = server().post("/", (ctx) => ctx.body);
    expect(await (await app.test().post("/", { any: "thing" })).json()).toEqual({
      any: "thing",
    });
  });
});

describe("response validation", () => {
  const shape = requires("name");

  it("passes a valid response through", async () => {
    const app = server().get("/", { response: shape }, () => ({ name: "Ada" }));
    const res = await app.test().get("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "Ada" });
  });

  it("responds 500 to an invalid response, leaking nothing", async () => {
    const app = server().get("/", { response: shape }, () => ({ secret: "x" }));
    const res = await app.test().get("/");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe("Server Error");
    expect(text).not.toContain("name");
    expect(text).not.toContain("secret");
  });

  it("skips returns that are not a JSON payload", async () => {
    // A bare status is not the resource the schema describes
    const app = server().post("/", { response: shape }, () => 201);
    expect((await app.test().post("/")).status).toBe(201);
  });
});

describe("onError receives a ValidationError", () => {
  it("with the source and issues for a request failure", async () => {
    let seen: any;
    const app = server({
      onError: (error: any) => {
        seen = error;
        return new Response("custom", { status: 400 });
      },
    }).post("/", { body: requires("name") }, () => 200);

    const res = await app.test().post("/", {});
    expect(res.status).toBe(400);
    expect(seen instanceof ValidationError).toBe(true);
    expect(seen.source).toBe("body");
    expect(seen.issues[0].message).toBe("Expected a string");
  });

  it("with source 'response' for a response failure", async () => {
    let seen: any;
    const app = server({
      onError: (error: any) => {
        seen = error;
        return new Response("bad", { status: 500 });
      },
    }).get("/", { response: requires("name") }, () => ({}));

    await app.test().get("/");
    expect(seen instanceof ValidationError).toBe(true);
    expect(seen.source).toBe("response");
    expect(seen.status).toBe(500);
  });
});

describe("real libraries", () => {
  it("zod, including coercion", async () => {
    const app = server().post(
      "/",
      { body: z.object({ name: z.string(), age: z.coerce.number() }) },
      (ctx) => ctx.body,
    );
    const ok = await app.test().post("/", { name: "Ada", age: "36" });
    expect(await ok.json()).toEqual({ name: "Ada", age: 36 });
    expect((await app.test().post("/", { age: "36" })).status).toBe(422);
  });

  it("valibot", async () => {
    const app = server().get(
      "/",
      { query: v.object({ page: v.pipe(v.string(), v.transform(Number)) }) },
      (ctx) => ({ page: ctx.url.query.page }),
    );
    expect(await (await app.test().get("/?page=3")).json()).toEqual({ page: 3 });
    expect((await app.test().get("/")).status).toBe(422);
  });

  it("arktype", async () => {
    // arktype's type-level API requires `strict` in the consumer's tsconfig
    // (this repo compiles without it), so this test is runtime-only.
    const shape: StandardSchemaV1<any, any> = type({
      name: "string",
      "email?": "string.email",
    } as never) as never;
    const app = server().post("/", { body: shape }, (ctx) => ctx.body);
    const ok = await app.test().post("/", { name: "Ada" });
    expect(await ok.json()).toEqual({ name: "Ada" });
    expect((await app.test().post("/", { name: 42 })).status).toBe(422);
  });

  it("two vendors on one route", async () => {
    const app = server().post(
      "/",
      {
        body: z.object({ name: z.string() }),
        query: v.object({ page: v.string() }),
      },
      (ctx) => ({ ...(ctx.body as object), ...ctx.url.query }),
    );
    const res = await app.test().post("/?page=1", { name: "Ada" });
    expect(await res.json()).toEqual({ name: "Ada", page: "1" });
    expect((await app.test().post("/?page=1", {})).status).toBe(422);
    expect((await app.test().post("/", { name: "Ada" })).status).toBe(422);
  });
});
