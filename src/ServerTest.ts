import type { Method, SerializableValue } from ".";
import { parseHeaders } from "./helpers";

function isSerializable(body: unknown): boolean {
  if (!body) return false;
  if (typeof body === "string") return false;
  if (body instanceof ReadableStream) return false;
  if (body instanceof FormData) return false;
  return true;
}

// A function that can be triggered for testing
export default function ServerTest(app: {
  settings: { port: number };
  fetch: (req: Request) => Promise<Response>;
}) {
  const port = app.settings.port;

  // let cookie = "";
  const fetch = async (
    path: string,
    method: Method,
    options: RequestInit = {},
  ) => {
    try {
      if (!options.headers) options.headers = {};
      if (isSerializable(options.body)) {
        options.headers["content-type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }
      // if (cookie && !options.headers.cookie) {
      //   options.headers.cookie = cookie;
      // }
      const res = await app.fetch(
        new Request(`http://localhost:${port}${path}`, {
          method,
          ...options,
        }),
      );

      const headers = parseHeaders(res.headers);
      let body: SerializableValue;
      // if (headers["set-cookie"]) {
      //   // TODO: app should really be a smart merge of the 2
      //   cookie = headers["set-cookie"];
      // }
      if (headers["content-type"]?.includes("application/json")) {
        body = await res.json();
      } else {
        body = await res.text();
      }
      return { status: res.status, headers, body };
    } catch (error) {
      return { status: 500, headers: {}, body: error.message };
    }
  };
  return {
    get: (path: string, options?: RequestInit) => fetch(path, "get", options),
    head: (path: string, options?: RequestInit) => fetch(path, "head", options),
    post: (path: string, body?: BodyInit, options?: RequestInit) =>
      fetch(path, "post", { body, ...options }),
    put: (path: string, body?: BodyInit, options?: RequestInit) =>
      fetch(path, "put", { body, ...options }),
    patch: (path: string, body?: BodyInit, options?: RequestInit) =>
      fetch(path, "patch", { body, ...options }),
    delete: (path: string, options?: RequestInit) =>
      fetch(path, "delete", options),
    options: (path: string, options?: RequestInit) =>
      fetch(path, "options", options),
  };
}
