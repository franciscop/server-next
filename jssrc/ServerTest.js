import { parseHeaders } from "./helpers";

// A function that can be triggered for testing
export default function ServerTest() {
  let cookie = "";
  const fetch = async (path, method, options = {}) => {
    if (!options.headers) options.headers = {};
    if (options.body && typeof options.body !== "string") {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    if (cookie && !options.headers.cookie) {
      options.headers.cookie = cookie;
    }
    const res = await this.fetch(
      new Request(`http://localhost:${this.opts.port}${path}`, {
        method,
        ...options,
      }),
    );

    const headers = parseHeaders(res.headers);
    let body;
    if (headers["set-cookie"]) {
      // TODO: this should really be a smart merge of the 2
      cookie = headers["set-cookie"];
    }
    if (headers["content-type"]?.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return { status: res.status, headers, body };
  };
  return {
    get: (path, options) => fetch(path, "get", options),
    head: (path, options) => fetch(path, "head", options),
    post: (path, body, options) => fetch(path, "post", { body, ...options }),
    put: (path, body, options) => fetch(path, "put", { body, ...options }),
    patch: (path, body, options) => fetch(path, "patch", { body, ...options }),
    delete: (path, options) => fetch(path, "delete", options),
    options: (path, options) => fetch(path, "options", options),
  };
}
