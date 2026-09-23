import type { Method, SerializableValue, Server } from ".";

type BodyValue = SerializableValue | BodyInit;

function isSerializable(
  body: BodyValue,
): body is Exclude<SerializableValue, string | null | undefined> {
  if (!body) return false;
  if (typeof body === "string") return false;
  if (body instanceof ReadableStream) return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (ArrayBuffer.isView(body)) return false;
  if (body instanceof URLSearchParams) return false;
  return true;
}

// `Max-Age=0` and a past `Expires` are both how a server deletes a cookie
const deletes = (attrs: string[]): boolean =>
  attrs.some((attr) => {
    const [rawKey, value = ""] = attr.split("=");
    const key = rawKey.trim().toLowerCase();
    if (key === "max-age") return Number(value) <= 0;
    if (key === "expires")
      return new Date(value.trim()).getTime() <= Date.now();
    return false;
  });

type NoBodyRequest = Omit<RequestInit, "body">;

// A function that can be triggered for testing
export default function ServerTest(app: Server<any>) {
  const port = app.settings.port;

  // A cookie jar, so a login survives across calls the way it does in a
  // browser. Values are kept exactly as they arrived, so they go back out
  // unchanged. Path and Domain are ignored: a test client talks to one app.
  const jar = new Map<string, string>();

  const keep = (res: Response): void => {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      if (deletes(attrs)) jar.delete(name);
      else jar.set(name, pair.slice(eq + 1).trim());
    }
  };

  const fetch = async (
    method: Method,
    path: string,
    options: NoBodyRequest & { body?: BodyValue } = {},
  ) => {
    // Never write back into what the caller passed: one options object reused
    // across calls (the natural pattern for auth headers) would otherwise keep
    // the content-type of the first JSON body, and the next upload through it
    // would be read as JSON. `new Headers` also accepts the shapes a plain
    // object index misses: a Headers instance and a [key, value][] array.
    const headers = new Headers(options.headers as HeadersInit);
    let body = options.body;
    if (isSerializable(body)) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }
    // An explicit `cookie` header wins, so a test can still send its own
    if (jar.size && !headers.has("cookie")) {
      const sent = [...jar].map(([name, value]) => `${name}=${value}`);
      headers.set("cookie", sent.join("; "));
    }
    // A full http(s) URL is used as-is, so a test can exercise the host it
    // runs on (`ctx.url.origin`, subdomains, ...); anything else is a path
    // served from localhost. Another scheme is neither, and concatenating it
    // onto the host would fail confusingly further down.
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) && !/^https?:\/\//i.test(path)) {
      throw new Error(
        `Only http(s) URLs can be tested, received "${path}". Pass a path, ` +
          "or the full URL of the host the request should hit.",
      );
    }
    const url = /^https?:\/\//i.test(path)
      ? path
      : `http://localhost:${port}${path}`;
    const res = await app.fetch(
      new Request(url, {
        ...(options as RequestInit),
        method,
        headers,
        body: body as BodyInit,
      }),
      // A test request comes from the machine running it, so the peer is
      // loopback: forwarding headers a test sends are trusted, as they would
      // be behind a real proxy.
      { requestIP: () => ({ address: "127.0.0.1" }) } as any,
    );
    keep(res);
    return res;
  };

  return {
    get: (path: string, options?: NoBodyRequest) => fetch("get", path, options),
    head: (path: string, options?: NoBodyRequest) =>
      fetch("head", path, options),
    post: (path: string, body?: BodyValue, options?: NoBodyRequest) =>
      fetch("post", path, { body, ...options }),
    put: (path: string, body?: BodyValue, options?: NoBodyRequest) =>
      fetch("put", path, { body, ...options }),
    patch: (path: string, body?: BodyValue, options?: NoBodyRequest) =>
      fetch("patch", path, { body, ...options }),
    delete: (path: string, options?: NoBodyRequest) =>
      fetch("delete", path, options),
    options: (path: string, options?: NoBodyRequest) =>
      fetch("options", path, options),
    // The cookies the app has set so far, and a fresh session on demand
    get cookies() {
      return Object.fromEntries(jar);
    },
    clear: () => jar.clear(),
  };
}
