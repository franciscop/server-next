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

type NoBodyRequest = Omit<RequestInit, "body">;

// A function that can be triggered for testing
export default function ServerTest(app: Server) {
  const port = app.settings.port;

  // let cookie = "";
  const fetch = async (
    method: Method,
    path: string,
    options: NoBodyRequest & { body?: BodyValue } = {},
  ) => {
    if (!options.headers) options.headers = {};
    if (isSerializable(options.body)) {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
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
    return await app.fetch(
      new Request(url, {
        method,
        ...(options as RequestInit),
      }),
    );
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
  };
}
