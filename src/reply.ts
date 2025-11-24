import { createCookies, toWeb, types } from "./helpers";
import type { Cookie } from "./types";

type CookieOptions = string | string[] | Cookie | Cookie[] | null;
const EXPIRED = new Date(0).toUTCString();

interface ResponseData {
  headers: Headers;
  status?: number;
}

class Reply {
  res: ResponseData;

  constructor() {
    this.res = {
      headers: new Headers(),
    };
  }

  status(status: number): this {
    this.res.status = status;
    return this;
  }

  type(type?: string): this {
    if (!type) return this;
    type = types[type.replace(/^\./, "")] || type;
    this.res.headers.set("content-type", type);
    return this;
  }

  download(name?: string): this {
    const ext = name?.split(".").pop();
    if (type && ext && !this.res.headers.get("content-type")) this.type(ext);
    const filename = name ? `; filename="${encodeURIComponent(name)}"` : "";
    return this.headers("content-disposition", `attachment${filename}`);
  }

  headers(key: string | Record<string, string>, value?: string): this {
    if (typeof key !== "string") {
      Object.entries(key).map(([key, value]) => this.headers(key, value));
      return this;
    }

    if (Array.isArray(value)) {
      Object.values(value).map((val) => this.headers(key, val));
      return this;
    }

    this.res.headers.append(key, value);
    return this;
  }

  cookies(
    key: string | Record<string, CookieOptions>,
    value?: CookieOptions,
  ): this {
    // cookies({ hello: ... })
    if (typeof key === "object") {
      Object.entries(key).map(([key, value]) => this.cookies(key, value));
      return this;
    }

    // cookies("hello", [...])
    if (Array.isArray(value)) {
      Object.values(value).map((val) => this.cookies(key, val));
      return this;
    }

    // cookies("hello", null)
    console.log(key, value);
    if (value === null) return this.cookies(key, { expires: EXPIRED });

    // cookies("hello", "world")
    if (typeof value !== "object") return this.cookies(key, { value });

    // Actually create the cookies
    return this.headers("set-cookie", createCookies(key, value));
  }

  json(body: unknown): Response {
    return this.headers("content-type", "application/json").send(
      JSON.stringify(body),
    );
  }

  redirect(path: string): Response {
    return this.headers("location", path).status(302).send();
  }

  async file(path: string): Promise<Response> {
    try {
      const fs = await import("node:fs");
      const ext = path.split(".").pop();
      const stream = fs.createReadStream(path);
      return this.type(ext).send(stream);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return this.status(404).send();
      }
      throw error;
    }
  }

  send(body: string | Buffer | ReadableStream | any = ""): Response {
    const { status = 200, headers } = this.res;

    if (typeof body === "string") {
      if (!headers.get("content-type")) {
        const isHtml = body.trim().startsWith("<");
        headers.set("content-type", isHtml ? "text/html" : "text/plain");
      }
      return new Response(body, { status, headers });
    }

    const name = body?.constructor?.name;
    if (name === "Buffer") {
      return new Response(body, { status, headers });
    }

    if (typeof body?.getReader === "function") {
      return new Response(body, { status, headers });
    }

    if (name === "PassThrough" || name === "Readable") {
      return new Response(toWeb(body), { status, headers });
    }

    headers.set("content-type", "application/json");
    return new Response(JSON.stringify(body), { status, headers });
  }
}

type Params<K extends keyof Reply> = Reply[K] extends (...args: infer A) => any
  ? A
  : never;

const r = () => new Reply();
export const status = (...args: Params<"status">) => r().status(...args);
export const headers = (...args: Params<"headers">) => r().headers(...args);
export const type = (...args: Params<"type">) => r().type(...args);
export const download = (...args: Params<"download">) => r().download(...args);
export const cookies = (...args: Params<"cookies">) => r().cookies(...args);
export const send = (...args: Params<"send">) => r().send(...args);
export const json = (...args: Params<"json">) => r().json(...args);
export const file = (...args: Params<"file">) => r().file(...args);
export const redirect = (...args: Params<"redirect">) => r().redirect(...args);
