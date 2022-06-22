import { inspect } from "util";

const colors = {
  string: process.env.NO_COLOR ? "" : "\x1b[32m",
  number: process.env.NO_COLOR ? "" : "\x1b[33m",
};

const properties = [
  "hash",
  "host",
  "hostname",
  "href",
  "origin",
  "params",
  "password",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "searchParams",
  "username",
];

export default class ServerUrl extends URL {
  constructor(urlString) {
    super(urlString);

    const custom = {
      port: +this.port || null,
      path: this.pathname,
      params: {},
      query: this.getQuery(this.searchParams.entries()),
    };

    for (let key of properties) {
      const value = key in custom ? custom[key] : this[key];
      Object.defineProperty(this, key, {
        value,
        enumerable: true,
        writable: true,
      });
    }
  }

  [inspect.custom]() {
    const props = Object.keys(this)
      .map((key) => {
        const color = colors[typeof this[key]] || "";
        return `  ${key}: ${color}${inspect(this[key])}\x1b[0m`;
      })
      .join("\n");
    return `ServerUrl {\n${props}\n}`;
  }

  getQuery(entries) {
    const query = {};
    for (const [key, value] of entries) {
      query[key] = value;
    }
    return query;
  }

  toString() {
    return this.href;
  }
}
