import server, { router } from "../index";

const schema = {
  "~standard": {
    version: 1 as const,
    vendor: "test",
    validate: (value: unknown) => ({ value }),
  },
};

// A `raw` or `stream` route hands the handler bytes or an unread stream, so a
// body schema could never run against it: that combination is a mistake and
// fails at boot, not silently at request time.
describe("parser/schema conflicts fail at boot", () => {
  it("rejects parser: 'raw' with a body schema on the same route", () => {
    expect(() => {
      server().post("/hook", { parser: "raw", body: schema }, () => 200);
    }).toThrow(/parser/);
  });

  it("rejects parser: 'stream' with a body schema on the same route", () => {
    expect(() => {
      server().post("/up", { parser: "stream", body: schema }, () => 200);
    }).toThrow(/parser/);
  });

  it("rejects a global parser with a route body schema", () => {
    expect(() => {
      server({ parser: "raw" }).post("/hook", { body: schema }, () => 200);
    }).toThrow(/parser/);
  });

  it("rejects the conflict when a router is merged in", () => {
    const routes = router().post("/hook", { body: schema }, () => 200);
    expect(() => {
      server({ parser: "raw" }).use(routes);
    }).toThrow(/parser/);
  });

  it("allows a route parser override alongside a global one", () => {
    // The route says `parse`, so the schema is fine even with a raw default
    const app = server({ parser: "raw" }).post(
      "/json",
      { parser: "parse", body: schema },
      () => 200,
    );
    expect(app).toBeDefined();
  });

  it("allows query/params schemas on raw and stream routes", () => {
    // Only the body is unreadable there; the URL is always available
    const app = server({ parser: "raw" }).post(
      "/hook",
      { query: schema },
      () => 200,
    );
    expect(app).toBeDefined();
  });
});

describe("schemas are method-only", () => {
  it("rejects a root-level body", () => {
    expect(() => server({ body: schema } as any)).toThrow(/route/);
  });

  it("rejects the old root body mode with a pointer to parser", () => {
    expect(() => server({ body: "raw" } as any)).toThrow(/parser/);
  });

  it("rejects other root-level schema keys", () => {
    expect(() => server({ query: schema } as any)).toThrow(/route/);
    expect(() => server({ response: schema } as any)).toThrow(/route/);
  });
});
