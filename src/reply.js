import fs from "fs/promises";

import { types } from "./helpers/index.js";

function Reply() {}

Reply.prototype.res = { headers: {}, cookies: {} };

// INTERNAL
Reply.prototype.generateHeaders = function () {
  const cookies = Object.entries(this.res.cookies)
    .map(([k, { value, path = "/" }]) => `${k}=${value};Path=${path}`)
    .join(";");
  return { ...this.res.headers, "set-cookie": cookies };
};

// PARTIAL
Reply.prototype.status = function (status) {
  this.res.status = status;
  return this;
};

// `.html`, `html`, `text/html`
Reply.prototype.type = function (type) {
  if (!type) return this;
  this.res.headers["content-type"] = types[type.replace(/^\./)] || type;
  return this;
};

// Set extra headers
Reply.prototype.headers = function (headers) {
  if (!headers || typeof headers !== "object") return this;
  for (let key in headers) {
    this.res.headers[key] = headers[key];
  }
  return this;
};

// Set extra cookies
Reply.prototype.cookies = function (cookies) {
  if (!cookies || typeof cookies !== "object") return this;
  for (let key in cookies) {
    if (typeof cookies[key] === "string") {
      this.res.cookies[key] = { value: cookies[key] };
    } else {
      this.res.cookies[key] = cookies[key];
    }
  }
  return this;
};

// FINAL
Reply.prototype.json = function (body) {
  return headers({ "content-type": "application/json" }).send(
    JSON.stringify(body)
  );
};

Reply.prototype.file = async function (path) {
  const data = await fs.readFile(path, "utf-8");
  if (data) return this.type(path.split(".").pop()).send(data);
  return status(404).send();
};

Reply.prototype.view = async function (path) {
  return async (ctx) => {
    if (!ctx.options.views) {
      throw new Error("Views not enabled");
    }
    const data = await ctx.options.views.read(path);
    if (data) return this.type(path.split(".").pop()).send(data);
    return status(404).send();
  };
};

Reply.prototype.send = function (body = "") {
  const { status = 200 } = this.res;

  if (typeof body === "string") {
    // Not yet set, so infer the type from type of string
    if (!this.res.headers["content-type"]) {
      const isHtml = body.startsWith("<");
      this.res.headers["content-type"] = isHtml ? "text/html" : "text/plain";
    }

    const headers = this.generateHeaders();
    return new Response(body, { status, headers });
  }

  // This is a bit loopy, send({}) => json({}) => send('{}')
  return this.json(body);
};

// INTERNAL
export { Reply };

// PARTIAL
export const status = (...args) => new Reply().status(...args);
export const type = (...args) => new Reply().type(...args);
export const headers = (...args) => new Reply().headers(...args);
export const cookies = (...args) => new Reply().cookies(...args);

// FINAL
export const send = (...args) => new Reply().send(...args);
export const json = (...args) => new Reply().json(...args);
export const file = (...args) => new Reply().file(...args);
export const view = (...args) => new Reply().view(...args);
