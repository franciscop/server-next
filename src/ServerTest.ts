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

// A function that can be triggered for testing
export default function ServerTest(app: Server) {
  const port = app.settings.port;

  // let cookie = "";
  const fetch = async (
    path: string,
    method: Method,
    options: Omit<RequestInit, "body"> & { body?: BodyValue } = {},
  ) => {
    if (!options.headers) options.headers = {};
    if (isSerializable(options.body)) {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    return await app.fetch(
      new Request(`http://localhost:${port}${path}`, {
        method,
        ...(options as RequestInit),
      }),
    );
  };
  return {
    get: (path: string, options?: Omit<RequestInit, "body">) =>
      fetch(path, "get", options),
    head: (path: string, options?: Omit<RequestInit, "body">) =>
      fetch(path, "head", options),
    post: (
      path: string,
      body?: BodyValue,
      options?: Omit<RequestInit, "body">,
    ) => fetch(path, "post", { body, ...options }),
    put: (
      path: string,
      body?: BodyValue,
      options?: Omit<RequestInit, "body">,
    ) => fetch(path, "put", { body, ...options }),
    patch: (
      path: string,
      body?: BodyValue,
      options?: Omit<RequestInit, "body">,
    ) => fetch(path, "patch", { body, ...options }),
    delete: (path: string, options?: Omit<RequestInit, "body">) =>
      fetch(path, "delete", options),
    options: (path: string, options?: Omit<RequestInit, "body">) =>
      fetch(path, "options", options),
  };
}
