import { createCookies, toWeb, types } from "./helpers/index.js";

interface ResponseData {
  headers: Record<string, string>;
  cookies: Record<string, { value: string } | string>;
  status?: number;
}

class Reply {
  res: ResponseData;

  constructor() {
    this.res = {
      headers: {},
      cookies: {},
    };
  }

  private generateHeaders(): Headers {
    const headers = new Headers(this.res.headers);
    for (const cookie of createCookies(this.res.cookies)) {
      headers.append("set-cookie", cookie);
    }
    return headers;
  }

  status(status: number): this {
    this.res.status = status;
    return this;
  }

  type(type?: string): this {
    if (!type) return this;
    type = types[type.replace(/^\./, "")] || type;
    return this.headers({ "content-type": type });
  }

  download(name: string, type?: string): this {
    if (name && !type) type = name.split(".").pop();
    if (type) this.type(type);
    const filename = name ? `; filename="${name}"` : "";
    return this.headers({ "content-disposition": `attachment${filename}` });
  }

  headers(headers: Record<string, string>): this {
    if (!headers || typeof headers !== "object") return this;
    for (const key in headers) {
      this.res.headers[key] = headers[key];
    }
    return this;
  }

  cookies(cookies: Record<string, { value: string } | string>): this {
    if (!cookies || typeof cookies !== "object") return this;
    for (const key in cookies) {
      if (typeof cookies[key] === "string") {
        this.res.cookies[key] = { value: cookies[key] as string };
      } else {
        this.res.cookies[key] = cookies[key];
      }
    }
    return this;
  }

  json(body: unknown): Response {
    return this.headers({
      "content-type": "application/json",
    }).send(JSON.stringify(body));
  }

  redirect(Location: string): Response {
    return this.headers({ Location }).status(302).send();
  }

  async file(
    path: string,
    renderer: (data: Buffer) => Promise<Buffer | string> = async (data) => data,
  ): Promise<Response> {
    try {
      const fs = await import("node:fs/promises");
      const data = await fs.readFile(path);
      const ext = path.split(".").pop();
      return this.type(ext).send(await renderer(data));
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return this.status(404).send();
      }
      throw error;
    }
  }

  async view(
    path: string,
    renderer: (data: Buffer) => Promise<Buffer | string> = async (data) => data,
    ctx?: {
      options: { views?: { read: (path: string) => Promise<Buffer | null> } };
    },
  ): Promise<Response> {
    if (!ctx?.options.views) {
      throw new Error("Views not enabled");
    }
    const data = await ctx.options.views.read(path);
    if (!data) return this.status(404).send();
    return this.type(path.split(".").pop()).send(await renderer(data));
  }

  send(body: string | Buffer | ReadableStream | any = ""): Response {
    const { status = 200 } = this.res;

    if (typeof body === "string") {
      if (!this.res.headers["content-type"]) {
        const isHtml = body.startsWith("<");
        this.res.headers["content-type"] = isHtml ? "text/html" : "text/plain";
      }

      const headers = this.generateHeaders();
      return new Response(body, { status, headers });
    }

    const name = body?.constructor?.name;
    if (name === "Buffer") {
      const headers = this.generateHeaders();
      return new Response(body, { status, headers });
    }

    if (name === "ReadableStream") {
      const headers = this.generateHeaders();
      return new Response(body, { status, headers });
    }

    if (name === "PassThrough" || name === "Readable") {
      const headers = this.generateHeaders();
      return new Response(toWeb(body), { status, headers });
    }

    return this.json(body);
  }
}

export { Reply };

export const status = (...args: [number]) => new Reply().status(...args);
export const headers = (...args: [Record<string, string>]) =>
  new Reply().headers(...args);
export const type = (...args: [string?]) => new Reply().type(...args);
export const download = (...args: [string, string?]) =>
  new Reply().download(...args);
export const cookies = (
  ...args: [Record<string, { value: string } | string>]
) => new Reply().cookies(...args);
export const send = (...args: [string | Buffer | ReadableStream]) =>
  new Reply().send(...args);
export const json = (...args: [unknown]) => new Reply().json(...args);
export const file = (
  ...args: [string, ((data: Buffer) => Promise<Buffer | string>)?]
) => new Reply().file(...args);
export const redirect = (...args: [string]) => new Reply().redirect(...args);
export const view = (
  ...args: [
    string,
    ((data: Buffer) => Promise<Buffer | string>)?,
    {
      options: { views?: { read: (path: string) => Promise<Buffer | null> } };
    }?,
  ]
) => new Reply().view(...args);
