import { isBucketFile } from "./body/bucket";
import { resolveCache } from "./http/cache";
import createCookies from "./http/createCookies";
import mimes from "./http/mimes";
import setIfAbsent from "./http/setIfAbsent";
import disposition from "./http/disposition";
import fileType from "./http/fileType";
import { CLIMBS } from "./http/security";
import serialize from "./pipeline/serialize";
import type { Readable } from "node:stream";
import type {
  BucketFile,
  CacheOption,
  Cookie,
  SerializableValue,
} from "./types";

type CookieOptions = string | string[] | Cookie | Cookie[] | null;

// Everything `send()` accepts, which is everything a route can return,
// promises included (they are awaited, so `send(fetch(url))` works)
type SendBody =
  | SerializableValue
  | JSX.Element
  | Uint8Array
  | ReadableStream
  | Readable
  | Response
  | Reply
  | BucketFile
  | Promise<SendBody>;
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

  json(body: unknown): Promise<Response> {
    // `undefined` stringifies to undefined, which would send an empty body
    // labelled as JSON and throw on the client's res.json()
    if (body === undefined) body = null;
    // Fill-if-absent, so an explicit type()/headers() content-type always wins.
    // Bare `application/json`, no charset. JSON is always UTF-8 by spec, and its
    // media type defines no charset parameter (RFC 8259: "Adding one really has
    // no effect on compliant recipients"), so it's redundant. Text types (text/*)
    // do carry `; charset=utf-8`; JSON deliberately doesn't, matching Hono/Elysia
    // and the fetch spec.
    setIfAbsent(this.res.headers, "content-type", "application/json");
    return this.send(JSON.stringify(body));
  }

  redirect(path: string): Promise<Response> {
    // 302 is only the default: an explicitly set status (301/307/308) wins
    this.headers("location", path);
    if (this.res.status == null) this.res.status = 302;
    return this.send();
  }

  async file(path: string | BucketFile): Promise<Response> {
    // A bucket file handle: stream it with a type guessed from its name, and a
    // 404 when it is missing, the same contract as a disk path below.
    if (typeof path !== "string") {
      // A bodyless 404, the same response returning a missing file produces
      if (!(await path.exists())) return new Response(null, { status: 404 });
      return this.type(fileType(path)).send(path.stream());
    }
    // A '..' segment means the path was built from input that climbed out of
    // where it was meant to stay; `send` (Express) refuses these too. Normal
    // paths are already resolved, since path.join() collapses the dots.
    if (CLIMBS.test(path)) {
      return new Response(null, { status: 404 });
    }
    try {
      const fs = await import("node:fs");
      const ext = path.split(".").pop();
      // Missing files reject asynchronously, so 404 there as well as here
      await fs.promises.access(path);
      const stream = fs.createReadStream(path);
      return this.type(ext).send(stream);
    } catch (error: any) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        return new Response(null, { status: 404 });
      }
      throw error;
    }
  }

  // Accepts everything a route can return, so `send(x)` and `return x` agree.
  // Async because a bucket file has to be read before its status is known;
  // routes await whatever they return, so this is invisible in normal use.
  async send(input: SendBody = ""): Promise<Response> {
    const { status = 200, headers } = this.res;
    // The branches below identify the body by duck-typing (thenables, streams,
    // byte views), which the parameter's union cannot express, so widen here
    let body: any = input;

    // 101/204/205/304 are "null body status" codes: a Response carrying any body
    // (even "") throws in spec-compliant runtimes like Node/undici (Bun is
    // lenient), so send nothing regardless of what was passed.
    if (status === 101 || status === 204 || status === 205 || status === 304) {
      return new Response(null, { status, headers });
    }

    // `null` means no body, as with `new Response(null)`; without this it would
    // fall through to the JSON default and send the string "null"
    if (body === null) body = "";

    // A promise resolves first, the same as returning one from a route does,
    // so `send(fetch(url))` works without awaiting it yourself.
    if (typeof body?.then === "function") body = await body;

    // A JSX element is a thunk: call it for the HTML, the same as returning it
    // from a route does. The string branch below then types it as `text/html`.
    if (typeof body === "function") body = body();

    // A thunk that returns a promise is an async component. The renderer has no
    // async support anywhere (a nested one renders nothing), so say so.
    if (typeof body?.then === "function") {
      throw new Error(
        "Cannot render an async component: components must be synchronous. " +
          "Await the data before rendering and pass it in as props.",
      );
    }

    // A Reply resolves to its own Response first, then merges below
    if (body instanceof Reply) body = await body.send();

    // A Response carries its own body and status; anything set on this chain
    // (headers, cookies, an explicit status) is applied on top of it.
    if (body instanceof Response) {
      const merged = new Headers(body.headers);
      for (const [key, value] of headers) {
        if (key === "set-cookie") continue;
        merged.set(key, value);
      }
      for (const cookie of headers.getSetCookie?.() ?? []) {
        merged.append("set-cookie", cookie);
      }
      // fetch() already decoded the body, so drop a stale content-encoding
      if (body.url && /^(br|gzip)$/.test(merged.get("content-encoding") || "")) {
        merged.delete("content-encoding");
      }
      return new Response(body.body, {
        status: this.res.status ?? body.status,
        headers: merged,
      });
    }

    // A bucket file: same handling as returning one, including the 404
    if (isBucketFile(body)) {
      return this.file(body);
    }

    // Everything else serializes by shape: Blob, string, bytes, streams,
    // iterables, and JSON as the default.
    return new Response(serialize(body, headers), { status, headers });
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
