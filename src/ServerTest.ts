import type { Method, SerializableValue, Server } from ".";
import { parseHeaders } from "./helpers";

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
          ...(options as RequestInit),
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
