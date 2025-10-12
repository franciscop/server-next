import { BodyInit } from "bun";
import { parseHeaders } from "./helpers";
import { Method } from "./types";

// A function that can be triggered for testing
export default function ServerTest() {
  // let cookie = "";
  const fetch = async (
    path: string,
    method: Method,
    options: RequestInit = {},
  ) => {
    if (!options.headers) options.headers = {};
    if (options.body && typeof options.body !== "string") {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    // if (cookie && !options.headers.cookie) {
    //   options.headers.cookie = cookie;
    // }
    const res = await this.fetch(
      new Request(`http://localhost:${this.settings.port}${path}`, {
        method,
        ...options,
      }),
    );

    const headers = parseHeaders(res.headers);
    let body;
    // if (headers["set-cookie"]) {
    //   // TODO: this should really be a smart merge of the 2
    //   cookie = headers["set-cookie"];
    // }
    if (headers["content-type"]?.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return { status: res.status, headers, body };
  };
  return {
    get: (path: string, options: RequestInit) => fetch(path, "get", options),
    head: (path: string, options: RequestInit) => fetch(path, "head", options),
    post: (path: string, body: BodyInit, options: RequestInit) =>
      fetch(path, "post", { body, ...options }),
    put: (path: string, body: BodyInit, options: RequestInit) =>
      fetch(path, "put", { body, ...options }),
    patch: (path: string, body: BodyInit, options: RequestInit) =>
      fetch(path, "patch", { body, ...options }),
    delete: (path: string, options: RequestInit) =>
      fetch(path, "delete", options),
    options: (path: string, options: RequestInit) =>
      fetch(path, "options", options),
  };
}
