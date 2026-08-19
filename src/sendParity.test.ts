import server, { send, status } from ".";
import { cleanupBuckets, realBucket } from "./tests/realBucket";

// `.send(x)` and `return x` are the two ways to answer a request, so they
// should accept the same values and produce the same response. Each case is
// rendered both ways and compared.

const snapshot = async (res: Response) => ({
  status: res.status,
  type: res.headers.get("content-type"),
  body: await res.text(),
});

// A fresh value per call: streams and files cannot be replayed
const bothWays = async (make: () => any) => {
  const returned = await server()
    .get("/", () => make())
    .test()
    .get("/");
  const sent = await server()
    .get("/", () => send(make()))
    .test()
    .get("/");
  return [await snapshot(returned), await snapshot(sent)];
};

afterAll(() => cleanupBuckets());

describe("send() and return accept the same values", () => {
  it("a string", async () => {
    const [a, b] = await bothWays(() => "<p>hi</p>");
    expect(b).toEqual(a);
  });

  it("an object", async () => {
    const [a, b] = await bothWays(() => ({ a: 1, b: [2, 3] }));
    expect(b).toEqual(a);
  });

  it("an array", async () => {
    const [a, b] = await bothWays(() => [1, 2, 3]);
    expect(b).toEqual(a);
  });

  it("a Buffer", async () => {
    const [a, b] = await bothWays(() => Buffer.from("bytes"));
    expect(b).toEqual(a);
  });

  it("a ReadableStream", async () => {
    const [a, b] = await bothWays(
      () =>
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode("streamed"));
            c.close();
          },
        }),
    );
    expect(b).toEqual(a);
  });

  it("a JSX element (a thunk)", async () => {
    const [a, b] = await bothWays(() => () => "<b>jsx</b>");
    expect(b).toEqual(a);
  });

  it("a Response", async () => {
    const [a, b] = await bothWays(
      () => new Response("made", { status: 201 }),
    );
    expect(b).toEqual(a);
  });

  it("a Reply", async () => {
    // A bare, unsent chain: the framework finalizes it with .send()
    const [a, b] = await bothWays(() => status(404).type("txt"));
    expect(b).toEqual(a);
  });

  it("a Blob", async () => {
    const [a, b] = await bothWays(
      () => new Blob(["blobby"], { type: "text/plain" }),
    );
    expect(b).toEqual(a);
  });

  it("a sync iterator", async () => {
    const [a, b] = await bothWays(function* () {
      yield "one";
      yield "two";
    });
    expect(b).toEqual(a);
  });

  it("an async iterator", async () => {
    const [a, b] = await bothWays(async function* () {
      yield "one";
      yield "two";
    });
    expect(b).toEqual(a);
  });

  it("a promise, which is what fetch() returns", async () => {
    const [a, b] = await bothWays(() =>
      Promise.resolve(new Response("proxied", { status: 201 })),
    );
    expect(b).toEqual(a);
  });

  it("a promise of a plain value", async () => {
    const [a, b] = await bothWays(() => Promise.resolve({ ok: true }));
    expect(b).toEqual(a);
  });

  it("a bucket file", async () => {
    const bucket = realBucket();
    await bucket.file("note.txt").write("from the bucket");
    const [a, b] = await bothWays(() => bucket.file("note.txt"));
    expect(b).toEqual(a);
  });

  it("a missing bucket file (404 either way)", async () => {
    const bucket = realBucket();
    const [a, b] = await bothWays(() => bucket.file("gone.txt"));
    expect(a.status).toBe(404);
    expect(b).toEqual(a);
  });
});

describe("where they deliberately differ", () => {
  it("a number is a status when returned, a JSON body when sent", async () => {
    const [a, b] = await bothWays(() => 201);
    expect(a.status).toBe(201);
    expect(a.body).toBe("");
    expect(b.status).toBe(200);
    expect(b.body).toBe("201");
  });
});
