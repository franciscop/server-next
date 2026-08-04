import { createCookies, mimes, resolveCache, toWeb } from "./helpers";
import disposition from "./helpers/disposition";
import fileType from "./helpers/fileType";
import isHtml from "./helpers/isHtml";
import isReadableStream from "./helpers/isReadableStream";
import type { BucketFile, CacheOption, Cookie } from "./types";

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
    type = mimes[type.replace(/^\./, "")] || type;
    this.res.headers.set("content-type", type);
    return this;
  }

  download(name?: string): this {
    const ext = name?.split(".").pop();
    if (ext && !this.res.headers.get("content-type")) this.type(ext);
    return this.headers("content-disposition", disposition(name));
  }

  headers(
    key: string | Record<string, string | string[]>,
    value?: string | string[],
  ): this {
    if (typeof key !== "string") {
      Object.entries(key).map(([key, value]) => this.headers(key, value));
      return this;
    }

    // An array sends the header once per value, for list headers like `Link`
    if (Array.isArray(value)) {
      this.res.headers.delete(key);
      for (const val of value) this.res.headers.append(key, val);
      return this;
    }

    // Set-Cookie is the one header that must stack (cookies can't be merged
    // into one line); any other header replaces, so the last write wins
    if (key.toLowerCase() === "set-cookie") {
      this.res.headers.append(key, value);
    } else {
      this.res.headers.set(key, value);
    }
    return this;
  }

  cache(value: CacheOption): this {
    const resolved = resolveCache(value);
    if (resolved) this.res.headers.set("cache-control", resolved);
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
    if (value === null) return this.cookies(key, { expires: EXPIRED });

    // cookies("hello", "world")
    if (typeof value !== "object") return this.cookies(key, { value });

    // Actually create the cookies
    return this.headers("set-cookie", createCookies(key, value));
  }

  json(body: unknown): Response {
    // `undefined` stringifies to undefined, which would send an empty body
    // labelled as JSON and throw on the client's res.json()
    if (body === undefined) body = null;
    // Fill-if-absent, so an explicit type()/headers() content-type always wins.
    // Bare `application/json`, no charset. JSON is always UTF-8 by spec, and its
    // media type defines no charset parameter (RFC 8259: "Adding one really has
    // no effect on compliant recipients"), so it's redundant. Text types (text/*)
    // do carry `; charset=utf-8`; JSON deliberately doesn't, matching Hono/Elysia
    // and the fetch spec.
    if (!this.res.headers.get("content-type")) {
      this.res.headers.set("content-type", "application/json");
    }
    return this.send(JSON.stringify(body));
  }

  redirect(path: string): Response {
    // 302 is only the default: an explicitly set status (301/307/308) wins
    this.headers("location", path);
    if (this.res.status == null) this.res.status = 302;
    return this.send();
  }

  async file(path: string | BucketFile): Promise<Response> {
    // A bucket file handle: stream it with a type guessed from its name, and a
    // 404 when it's missing — the same contract as a disk path below.
    if (typeof path !== "string") {
      if (!(await path.exists())) return this.status(404).send();
      return this.type(fileType(path)).send(path.stream());
    }
    // A '..' segment means the path was built from input that climbed out of
    // where it was meant to stay; `send` (Express) refuses these too. Normal
    // paths are already resolved, since path.join() collapses the dots.
    if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)) return this.status(404).send();
    try {
      const fs = await import("node:fs");
      const ext = path.split(".").pop();
      // Missing files reject asynchronously, so 404 there as well as here
      await fs.promises.access(path);
      const stream = fs.createReadStream(path);
      return this.type(ext).send(stream);
    } catch (error: any) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        return this.status(404).send();
      }
      throw error;
    }
  }

  send(body: string | Buffer | ReadableStream | any = ""): Response {
    const { status = 200, headers } = this.res;

    // 101/204/205/304 are "null body status" codes: a Response carrying any body
    // (even "") throws in spec-compliant runtimes like Node/undici (Bun is
    // lenient), so send nothing regardless of what was passed.
    if (status === 101 || status === 204 || status === 205 || status === 304) {
      return new Response(null, { status, headers });
    }

    // `null` means no body, as with `new Response(null)`; without this it would
    // fall through to the JSON default and send the string "null"
    if (body === null) body = "";

    // A JSX element is a thunk: call it for the HTML, the same as returning it
    // from a route does. The string branch below then types it as `text/html`.
    if (typeof body === "function") body = body();

    // send() is synchronous, so it can't wait on a promise (an async component
    // being the usual source). Say so instead of serializing the promise.
    if (typeof body?.then === "function") {
      throw new Error(
        "send() received a promise, likely an async component. Await it first, " +
          "or return it from the route, which resolves it for you.",
      );
    }

    if (typeof body === "string") {
      if (!headers.get("content-type")) {
        headers.set("content-type", isHtml(body) ? mimes.html : mimes.text);
      }
      if (!headers.has("content-length")) {
        headers.set("content-length", String(Buffer.byteLength(body)));
      }
      return new Response(body, { status, headers });
    }

    const name = body?.constructor?.name;
    // Buffer or any typed array (e.g. the Uint8Array from a bucket file's
    // bytes()) is sent as raw bytes.
    if (body instanceof Uint8Array) {
      if (!headers.has("content-length")) {
        headers.set("content-length", String(body.length));
      }
      return new Response(body as BodyInit, { status, headers });
    }

    if (typeof body?.getReader === "function") {
      return new Response(body, { status, headers });
    }

    if (name === "PassThrough" || name === "Readable") {
      return new Response(toWeb(body), { status, headers });
    }

    if (isReadableStream(body)) {
      return new Response(toWeb(body), { status, headers });
    }

    // Default sends it as json. Bare `application/json`, no charset: JSON is
    // always UTF-8 by spec, so the param is redundant (see json() above).
    if (!headers.get("content-type")) {
      headers.set("content-type", "application/json");
    }
    const payload = JSON.stringify(body);
    if (!headers.has("content-length")) {
      headers.set("content-length", String(Buffer.byteLength(payload)));
    }
    return new Response(payload, { status, headers });
  }
}

type Params<K extends keyof Reply> = Reply[K] extends (...args: infer A) => any
  ? A
  : never;

const r = () => new Reply();
export const status = (...args: Params<"status">) => r().status(...args);
export const headers = (...args: Params<"headers">) => r().headers(...args);
export const type = (...args: Params<"type">) => r().type(...args);
export const cache = (...args: Params<"cache">) => r().cache(...args);
export const download = (...args: Params<"download">) => r().download(...args);
export const cookies = (...args: Params<"cookies">) => r().cookies(...args);
export const send = (...args: Params<"send">) => r().send(...args);
export const json = (...args: Params<"json">) => r().json(...args);
export const file = (...args: Params<"file">) => r().file(...args);
export const redirect = (...args: Params<"redirect">) => r().redirect(...args);
