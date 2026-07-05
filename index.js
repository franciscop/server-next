// src/ServerError.ts
var ServerError = class _ServerError extends Error {
  code;
  status;
  constructor(code, status2, message, vars = {}) {
    let messageStr;
    if (typeof message === "function") {
      messageStr = message(vars);
    } else {
      messageStr = message;
    }
    if (typeof messageStr !== "string")
      throw Error(`Invalid error ${messageStr}`);
    for (const key in vars) {
      let value = vars[key];
      value = Array.isArray(value) ? value.join(",") : value;
      const regex = new RegExp(`\\{${key}\\}`, "g");
      messageStr = messageStr.replace(regex, value);
    }
    super(messageStr);
    this.code = code;
    this.message = messageStr;
    this.status = status2;
  }
  static extend(errors) {
    for (const code in errors) {
      const error = errors[code];
      if (typeof error === "string") {
        _ServerError[code] = (vars = {}) => new _ServerError(code, 500, error, vars);
      } else {
        _ServerError[code] = (vars = {}) => new _ServerError(code, error.status, error.message, vars);
      }
    }
    return errors;
  }
};
var TypedServerError = ServerError;
var ServerError_default = TypedServerError;

// src/errors/index.ts
ServerError_default.extend({
  NO_STORE: "You need a 'store' to write 'ctx.session'",
  NO_STORE_WRITE: "You need a 'store' to write 'ctx.session.{key}'",
  NO_STORE_READ: "You need a 'store' to read 'ctx.session.{key}'",
  AUTH_ARGON_NEEDED: "Argon2 is needed for the auth module, please install it with 'npm i argon2'",
  AUTH_INVALID_TOKEN: { status: 401, message: "Invalid Authorization token" },
  AUTH_INVALID_COOKIE: { status: 401, message: "Invalid Authorization cookie" },
  AUTH_INVALID_HEADER: {
    status: 401,
    message: "Invalid authorization header {type}, must send 'Bearer {TOKEN}' (with space)"
  },
  AUTH_INVALID_STRATEGY: {
    status: 401,
    message: "Invalid Authorization type '{strategy}', valid one is '{valid}'"
  },
  AUTH_INVALID_STATE: { status: 403, message: "Invalid OAuth state" },
  AUTH_NO_PROVIDER: "No provider passed to the option 'auth.providers'",
  AUTH_INVALID_PROVIDER: {
    status: 401,
    message: "Invalid provider '{provider}', valid ones are: '{valid}'"
  },
  AUTH_NO_SESSION: { status: 401, message: "Invalid session" },
  AUTH_NO_USER: {
    status: 401,
    message: "Credentials do not correspond to a user"
  },
  LOGIN_NO_EMAIL: "The email is required to log in",
  LOGIN_INVALID_EMAIL: "The email you wrote is not correct",
  LOGIN_NO_PASSWORD: "The email is required to log in",
  LOGIN_INVALID_PASSWORD: "The password you wrote is not correct",
  LOGIN_WRONG_ACCOUNT: "That email does not correspond to any account",
  LOGIN_WRONG_PASSWORD: "That is not the valid password",
  REGISTER_NO_EMAIL: "Email needed",
  REGISTER_INVALID_EMAIL: "The email you wrote is not correct",
  REGISTER_NO_PASSWORD: "Password needed",
  REGISTER_INVALID_PASSWORD: "The password you wrote is not correct",
  REGISTER_EMAIL_EXISTS: "Email is already registered"
});

// src/polyfill.ts
globalThis.env = {};
if (typeof globalThis.Netlify !== "undefined") {
  Object.assign(
    globalThis.env,
    globalThis.Netlify.env.toObject()
  );
}
if (typeof process !== "undefined") {
  Object.assign(globalThis.env, process.env);
}

// src/helpers/createId.ts
var alphabet = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";
var random = (bytes) => crypto.getRandomValues(new Uint8Array(bytes));
var cyrb53 = (str, seed = 0) => {
  if (typeof str !== "string") str = String(str);
  let h1 = 3735928559 ^ seed;
  let h2 = 1103547991 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507);
  h1 ^= Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507);
  h2 ^= Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
var hash = (str, size) => {
  let chars = "";
  let num = cyrb53(str);
  for (let i = 0; i < size; i++) {
    if (num < alphabet.length) num = cyrb53(str, i);
    chars += alphabet[num % alphabet.length];
    num = Math.floor(num / alphabet.length);
  }
  return chars;
};
var randomId = (size = 16) => {
  let id = "";
  const bytes = random(size);
  while (size--) {
    id += alphabet[bytes[size] & 61];
  }
  return id;
};
function createId(source, size = 16) {
  if (source) return hash(source, size);
  return randomId(size);
}

// src/helpers/mimes.ts
var mimes_default = {
  aac: "audio/aac",
  abw: "application/x-abiword",
  arc: "application/x-freearc",
  avif: "image/avif",
  avi: "video/x-msvideo",
  azw: "application/vnd.amazon.ebook",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  bz: "application/x-bzip",
  bz2: "application/x-bzip2",
  cda: "application/x-cdf",
  csh: "application/x-csh",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gz: "application/gzip",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/vnd.microsoft.icon",
  ics: "text/calendar",
  jar: "application/java-archive",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  md: "text/markdown",
  mid: "audio/midi",
  midi: "audio/midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  mpkg: "application/vnd.apple.installer+xml",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  png: "image/png",
  pdf: "application/pdf",
  php: "application/x-httpd-php",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rar: "application/vnd.rar",
  rtf: "application/rtf",
  sh: "application/x-sh",
  svg: "image/svg+xml",
  tar: "application/x-tar",
  text: "text/plain",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  vsd: "application/vnd.visio",
  wav: "audio/wav",
  weba: "audio/webm",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xml: "application/xml",
  xul: "application/vnd.mozilla.xul+xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "7z": "application/x-7z-compressed"
};

// src/helpers/bucket.ts
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
function localBucket(root) {
  const base = path.resolve(root);
  const resolveKey = (name) => {
    if (!name) throw new Error("File name is required");
    const full = path.resolve(base, name.replace(/^\/+/, ""));
    if (full !== base && !full.startsWith(base + path.sep)) {
      throw new Error(`Path "${name}" escapes the bucket root`);
    }
    return full;
  };
  const file2 = (name, win) => {
    const full = resolveKey(name);
    const read = () => {
      let opts;
      if (win) {
        opts = { start: win.start };
        if (Number.isFinite(win.end)) opts.end = Math.max(win.start, win.end - 1);
      }
      const nodeStream = fs.createReadStream(full, opts);
      return new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        }
      });
    };
    return {
      path: full,
      id: name.replace(/^\/+/, ""),
      name: path.basename(name),
      async exists() {
        const stats = await fsp.stat(full).catch(() => null);
        return !!stats?.isFile();
      },
      async info() {
        const stats = await fsp.stat(full).catch(() => null);
        const exists = !!stats?.isFile();
        const total = stats?.size ?? 0;
        const size = win ? Math.max(0, Math.min(win.end, total) - win.start) : total;
        return { exists, size, date: stats?.mtime ?? null };
      },
      // Read-only view of [start, end), composed relative to the current window.
      slice(start, end) {
        const base2 = win?.start ?? 0;
        const cap = win?.end ?? Number.POSITIVE_INFINITY;
        const s = Math.min(cap, base2 + Math.max(0, start));
        const e = end === void 0 ? cap : Math.min(cap, base2 + end);
        return file2(name, { start: s, end: e });
      },
      async write(content) {
        await fsp.mkdir(path.dirname(full), { recursive: true });
        if (content instanceof ReadableStream) {
          const writable = fs.createWriteStream(full);
          for await (const chunk of content) {
            writable.write(chunk);
          }
          await new Promise((resolve2, reject) => {
            writable.on("error", reject);
            writable.end(() => resolve2());
          });
          return;
        }
        await fsp.writeFile(full, content);
      },
      stream() {
        return read();
      },
      async bytes() {
        if (win) return new Uint8Array(await new Response(read()).arrayBuffer());
        return new Uint8Array(await fsp.readFile(full));
      },
      async remove() {
        await fsp.unlink(full).catch(() => {
        });
      }
    };
  };
  return {
    file: file2,
    folder: (prefix) => localBucket(path.join(base, prefix))
  };
}
function bucket(root) {
  if (!root) return null;
  if (typeof root === "string") return localBucket(root);
  if (typeof root.file === "function") return root;
  throw new Error(
    "Invalid bucket: pass a directory path or a `bucket` instance (with .file())"
  );
}

// src/helpers/upload.ts
function parseBytes(value) {
  if (typeof value === "number") return value;
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3
  };
  const match = value.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) throw new Error(`Invalid size: "${value}"`);
  return parseFloat(match[1]) * (units[match[2]] ?? 1);
}
function getExt(filename) {
  const i = filename.lastIndexOf(".");
  if (i <= 0) return ".bin";
  return filename.slice(i).toLowerCase();
}
async function saveFileToBucket(originalName, data, bucket2, contentType) {
  const ext2 = getExt(originalName);
  const id = `${createId()}${ext2}`;
  const file2 = bucket2.file(id);
  await file2.write(data, { type: contentType });
  return {
    name: originalName,
    id,
    path: file2.path,
    type: contentType,
    size: data.length
  };
}
var UploadPipeline = class {
  _bucket;
  _limits = {};
  constructor(bucket2) {
    this._bucket = bucket(bucket2 ?? void 0);
  }
  limit(options) {
    this._limits = { ...this._limits, ...options };
    return this;
  }
  store(bucket2) {
    this._bucket = bucket(bucket2);
    return this;
  }
  async processFile(originalName, data, contentType) {
    const { maxSize, minSize, fileType } = this._limits;
    if (maxSize !== void 0 && data.length > parseBytes(maxSize)) {
      throw new Error(
        `File "${originalName}" is too large (${data.length} bytes, limit is ${maxSize})`
      );
    }
    if (minSize !== void 0 && data.length < parseBytes(minSize)) {
      throw new Error(
        `File "${originalName}" is too small (${data.length} bytes, minimum is ${minSize})`
      );
    }
    if (fileType && fileType.length > 0) {
      const ext2 = getExt(originalName);
      const mime = contentType.toLowerCase();
      const allowed = fileType.some(
        (t) => t.toLowerCase() === mime || t.toLowerCase() === ext2
      );
      if (!allowed) {
        throw new Error(
          `File type not allowed for "${originalName}" (got "${contentType}", allowed: ${fileType.join(", ")})`
        );
      }
    }
    if (!this._bucket) {
      throw new Error(
        `No destination configured. Pass a bucket to upload() or call .store()`
      );
    }
    return saveFileToBucket(originalName, data, this._bucket, contentType);
  }
};
function upload(bucket2) {
  return new UploadPipeline(bucket2);
}

// src/helpers/parseBody.ts
function getBoundary(header) {
  if (!header) return null;
  if (header.includes("multipart/form-data") && !header.includes("boundary=")) {
    console.error("Do not set the `Content-Type` manually for FormData");
  }
  const items = header.split(";");
  for (const item of items) {
    const trimmedItem = item.trim();
    if (trimmedItem.startsWith("boundary=")) {
      return trimmedItem.split("=")[1].trim();
    }
  }
  return null;
}
function getMatching(string, regex) {
  const matches = string.match(regex);
  return matches?.[1] ?? "";
}
function isProbablyText(buffer) {
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    const byte = buffer[i];
    if (byte === 0) return false;
    if (byte < 7 || byte > 13 && byte < 32) return false;
  }
  return true;
}
var extByMime = {};
for (const ext2 in mimes_default) extByMime[mimes_default[ext2]] = ext2;
function extFromType(type2) {
  const base = (type2 || "").split(";")[0].trim().toLowerCase();
  const ext2 = extByMime[base];
  if (ext2) return `.${ext2}`;
  const sub = base.split("/")[1];
  return sub && /^[a-z0-9]+$/.test(sub) ? `.${sub}` : ".bin";
}
var asIterable = (s) => s;
function toStream(input) {
  if (input instanceof ReadableStream) return input;
  return new ReadableStream({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    }
  });
}
async function toBuffer(input) {
  if (!(input instanceof ReadableStream)) return input;
  const chunks = [];
  for await (const chunk of asIterable(input)) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
function parseUrlEncoded(text) {
  const out = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const existing = out[key];
    if (existing === void 0) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}
function addField(body, name, value) {
  if (body[name] === void 0) {
    body[name] = value;
    return;
  }
  if (!Array.isArray(body[name])) body[name] = [body[name]];
  body[name].push(value);
}
function startPart(headerStr, dest) {
  const name = getMatching(headerStr, /name="(.+?)"/).trim().replace(/\[\]$/, "");
  if (!name) return { kind: "skip" };
  const filename = getMatching(headerStr, /filename="(.+?)"/).trim();
  if (!filename) return { kind: "text", name, chunks: [] };
  const type2 = getMatching(headerStr, /Content-Type:\s*([^\r\n]+)/i).trim() || "application/octet-stream";
  if (!dest) return { kind: "drop" };
  if (dest instanceof UploadPipeline) {
    return { kind: "pipefile", name, filename, type: type2, pipeline: dest, chunks: [] };
  }
  const id = `${createId()}${getExt(filename)}`;
  let controller;
  const readable = new ReadableStream({
    start(c) {
      controller = c;
    }
  });
  const file2 = dest.file(id);
  return {
    kind: "file",
    name,
    filename,
    type: type2,
    id,
    controller,
    file: file2,
    write: file2.write(readable, { type: type2 }),
    size: 0
  };
}
function feedPart(part, data) {
  if (data.length === 0) return;
  if (part.kind === "text" || part.kind === "pipefile") part.chunks.push(data);
  else if (part.kind === "file") {
    part.controller.enqueue(data);
    part.size += data.length;
  }
}
async function endPart(part, body) {
  if (part.kind === "text") {
    const buf = Buffer.concat(part.chunks);
    const value = isProbablyText(buf) ? buf.toString("utf-8").trim() : buf;
    addField(body, part.name, value);
  } else if (part.kind === "pipefile") {
    const buf = Buffer.concat(part.chunks);
    const ref = await part.pipeline.processFile(part.filename, buf, part.type);
    addField(body, part.name, ref);
  } else if (part.kind === "file") {
    part.controller.close();
    await part.write;
    addField(body, part.name, {
      name: part.filename,
      id: part.id,
      path: part.file.path,
      type: part.type,
      size: part.size
    });
  }
}
var BREAK = Buffer.from("\r\n\r\n");
async function parseMultipart(stream, boundary, dest) {
  const delim = Buffer.from(`\r
--${boundary}`);
  const body = {};
  let buf = Buffer.from("\r\n");
  let state = "boundary";
  let part = null;
  for await (const chunk of asIterable(stream)) {
    buf = Buffer.concat([buf, Buffer.from(chunk)]);
    let advanced = true;
    while (advanced) {
      advanced = false;
      if (state === "boundary") {
        const i = buf.indexOf(delim);
        if (i === -1) {
          if (buf.length >= delim.length) {
            buf = buf.subarray(buf.length - delim.length + 1);
          }
          break;
        }
        if (buf.length < i + delim.length + 2) break;
        const after = i + delim.length;
        if (buf[after] === 45 && buf[after + 1] === 45) return body;
        buf = buf.subarray(after + 2);
        state = "headers";
        advanced = true;
      } else if (state === "headers") {
        const i = buf.indexOf(BREAK);
        if (i === -1) break;
        part = startPart(buf.subarray(0, i).toString("utf-8"), dest);
        buf = buf.subarray(i + BREAK.length);
        state = "body";
        advanced = true;
      } else {
        const i = buf.indexOf(delim);
        if (i === -1) {
          const safe = buf.length - (delim.length - 1);
          if (safe > 0 && part) {
            feedPart(part, buf.subarray(0, safe));
            buf = buf.subarray(safe);
          }
          break;
        }
        if (part) {
          feedPart(part, buf.subarray(0, i));
          await endPart(part, body);
          part = null;
        }
        buf = buf.subarray(i);
        state = "boundary";
        advanced = true;
      }
    }
  }
  if (part) await endPart(part, body);
  return body;
}
async function streamToBucket(stream, type2, bucket2) {
  const id = `${createId()}${extFromType(type2)}`;
  const file2 = bucket2.file(id);
  let size = 0;
  let controller;
  const readable = new ReadableStream({
    start(c) {
      controller = c;
    }
  });
  const write = file2.write(readable, { type: type2 });
  for await (const chunk of asIterable(stream)) {
    controller.enqueue(chunk);
    size += chunk.byteLength;
  }
  controller.close();
  await write;
  if (!size) return void 0;
  return { name: id, id, path: file2.path, type: type2, size };
}
async function parseBody(input, contentType, dest) {
  const type2 = Array.isArray(contentType) ? contentType[0] : contentType;
  const boundary = type2 && /multipart\/form-data/i.test(type2) ? getBoundary(type2) : null;
  if (boundary) return parseMultipart(toStream(input), boundary, dest);
  if (!type2 || /^text\//i.test(type2)) {
    const buf = await toBuffer(input);
    return buf.length ? buf.toString("utf-8") : void 0;
  }
  if (/application\/json/i.test(type2)) {
    const buf = await toBuffer(input);
    return buf.length ? JSON.parse(buf.toString("utf-8")) : void 0;
  }
  if (/application\/x-www-form-urlencoded/i.test(type2)) {
    const buf = await toBuffer(input);
    return buf.length ? parseUrlEncoded(buf.toString("utf-8")) : void 0;
  }
  if (!dest) {
    const buf = await toBuffer(input);
    return buf.length ? buf : void 0;
  }
  if (dest instanceof UploadPipeline) {
    const buf = await toBuffer(input);
    return buf.length ? dest.processFile(`upload${extFromType(type2)}`, buf, type2) : void 0;
  }
  return streamToBucket(toStream(input), type2, dest);
}

// src/helpers/StatusError.ts
var StatusError = class extends Error {
  status;
  constructor(msg, status2 = 500) {
    super(msg);
    this.status = status2;
  }
};

// src/helpers/body.ts
var INF = Number.POSITIVE_INFINITY;
var resolveMax = (max) => max === false || max == null ? INF : parseBytes(max);
var tooLarge = (max) => new StatusError(`Request body exceeds the ${max}-byte limit`, 413);
var sources = /* @__PURE__ */ new WeakMap();
function setBodySource(ctx, source) {
  sources.set(ctx, source);
}
async function resolveBody(ctx, body) {
  const source = sources.get(ctx);
  if (!source) return void 0;
  const mode = typeof body === "string" ? body : body?.mode ?? "parse";
  const max = resolveMax(typeof body === "object" ? body?.max : void 0);
  const declared = Number(ctx.headers["content-length"]);
  if (max !== INF && declared > max) throw tooLarge(max);
  if (mode === "stream") return source.getStream();
  if (mode === "raw") {
    const raw = await source.getBuffer();
    if (raw.length > max) throw tooLarge(max);
    if (!raw.length) return void 0;
    if (!ctx.headers["content-length"]) {
      ctx.headers["content-length"] = String(raw.length);
    }
    return raw;
  }
  const stream = source.getStream();
  if (!stream) return void 0;
  let size = 0;
  const counted = stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > max) return controller.error(tooLarge(max));
        controller.enqueue(chunk);
      }
    })
  );
  const parsed = await parseBody(
    counted,
    ctx.headers["content-type"],
    ctx.options.uploads
  );
  if (size && !ctx.headers["content-length"]) {
    ctx.headers["content-length"] = String(size);
  }
  return parsed;
}

// src/helpers/clientIp.ts
var first = (v) => (Array.isArray(v) ? v[0] : v) || "";
var normalize = (ip) => ip.replace(/^::ffff:/, "");
function clientIp(headers2, opts = {}) {
  const { remoteAddress = "", trustProxy = false } = opts;
  const cf = first(headers2["cf-connecting-ip"]);
  if (cf) return normalize(cf);
  const nf = first(headers2["x-nf-client-connection-ip"]);
  if (nf) return normalize(nf);
  if (trustProxy) {
    const xff = first(headers2["x-forwarded-for"]);
    if (xff) return normalize(xff.split(",")[0].trim());
    const real = first(headers2["x-real-ip"]);
    if (real) return normalize(real);
  }
  return normalize(remoteAddress);
}

// src/helpers/isReadableStream.ts
function isReadableStream(obj) {
  return obj !== null && typeof obj === "object" && typeof obj.pipe === "function" && typeof obj.read === "function" && typeof obj.on === "function";
}

// src/reply.ts
var EXPIRED = (/* @__PURE__ */ new Date(0)).toUTCString();
var Reply = class {
  res;
  constructor() {
    this.res = {
      headers: new Headers()
    };
  }
  status(status2) {
    this.res.status = status2;
    return this;
  }
  type(type2) {
    if (!type2) return this;
    type2 = mimes_default[type2.replace(/^\./, "")] || type2;
    this.res.headers.set("content-type", type2);
    return this;
  }
  download(name) {
    const ext2 = name?.split(".").pop();
    if (ext2 && !this.res.headers.get("content-type")) this.type(ext2);
    const filename = name ? `; filename="${encodeURIComponent(name)}"` : "";
    return this.headers("content-disposition", `attachment${filename}`);
  }
  headers(key, value) {
    if (typeof key !== "string") {
      Object.entries(key).map(([key2, value2]) => this.headers(key2, value2));
      return this;
    }
    if (Array.isArray(value)) {
      Object.values(value).map((val) => this.headers(key, val));
      return this;
    }
    this.res.headers.append(key, value);
    return this;
  }
  cookies(key, value) {
    if (typeof key === "object") {
      Object.entries(key).map(([key2, value2]) => this.cookies(key2, value2));
      return this;
    }
    if (Array.isArray(value)) {
      Object.values(value).map((val) => this.cookies(key, val));
      return this;
    }
    if (value === null) return this.cookies(key, { expires: EXPIRED });
    if (typeof value !== "object") return this.cookies(key, { value });
    return this.headers("set-cookie", createCookies(key, value));
  }
  json(body) {
    return this.headers("content-type", "application/json").send(
      JSON.stringify(body)
    );
  }
  redirect(path2) {
    return this.headers("location", path2).status(302).send();
  }
  async file(path2) {
    try {
      const fs2 = await import("fs");
      const ext2 = path2.split(".").pop();
      const stream = fs2.createReadStream(path2);
      return this.type(ext2).send(stream);
    } catch (error) {
      if (error.code === "ENOENT") {
        return this.status(404).send();
      }
      throw error;
    }
  }
  send(body = "") {
    const { status: status2 = 200, headers: headers2 } = this.res;
    if (status2 === 101 || status2 === 204 || status2 === 205 || status2 === 304) {
      return new Response(null, { status: status2, headers: headers2 });
    }
    if (typeof body === "string") {
      if (!headers2.get("content-type")) {
        const isHtml = body.trim().startsWith("<");
        headers2.set("content-type", isHtml ? "text/html" : "text/plain");
      }
      if (!headers2.has("content-length")) {
        headers2.set("content-length", String(Buffer.byteLength(body)));
      }
      return new Response(body, { status: status2, headers: headers2 });
    }
    const name = body?.constructor?.name;
    if (name === "Buffer") {
      if (!headers2.has("content-length")) {
        headers2.set("content-length", String(body.length));
      }
      return new Response(body, { status: status2, headers: headers2 });
    }
    if (typeof body?.getReader === "function") {
      return new Response(body, { status: status2, headers: headers2 });
    }
    if (name === "PassThrough" || name === "Readable") {
      return new Response(toWeb(body), { status: status2, headers: headers2 });
    }
    if (isReadableStream(body)) {
      return new Response(toWeb(body), { status: status2, headers: headers2 });
    }
    if (!headers2.get("content-type")) {
      headers2.set("content-type", "application/json");
    }
    const payload = JSON.stringify(body);
    if (!headers2.has("content-length")) {
      headers2.set("content-length", String(Buffer.byteLength(payload)));
    }
    return new Response(payload, { status: status2, headers: headers2 });
  }
};
var r = () => new Reply();
var status = (...args) => r().status(...args);
var headers = (...args) => r().headers(...args);
var type = (...args) => r().type(...args);
var download = (...args) => r().download(...args);
var cookies = (...args) => r().cookies(...args);
var send = (...args) => r().send(...args);
var json = (...args) => r().json(...args);
var file = (...args) => r().file(...args);
var redirect = (...args) => r().redirect(...args);

// src/helpers/jwt.ts
var enc = new TextEncoder();
var dec = new TextDecoder();
var b64url = (data) => {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var unb64url = (seg) => {
  let b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - b64.length % 4) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
var hmacKey = (secret) => crypto.subtle.importKey(
  "raw",
  enc.encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);
async function signJwt(payload, secret, expires) {
  const now = Math.floor(Date.now() / 1e3);
  const claims = {
    iat: now,
    ...expires ? { exp: now + expires } : {},
    ...payload
  };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const data = `${head}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}
async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  let header;
  try {
    header = JSON.parse(dec.decode(unb64url(head)));
  } catch {
    return null;
  }
  if (header?.alg !== "HS256") return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    unb64url(sig),
    enc.encode(`${head}.${body}`)
  );
  if (!ok) return null;
  let payload;
  try {
    payload = JSON.parse(dec.decode(unb64url(body)));
  } catch {
    return null;
  }
  if (payload?.exp && Math.floor(Date.now() / 1e3) >= payload.exp) return null;
  return payload;
}

// src/auth/finishLogin.ts
async function finishLogin(ctx, input) {
  const settings = ctx.options.auth;
  const { strategy, cleanUser } = settings;
  const key = String(input.key);
  const auth2 = {
    id: createId(),
    strategy,
    provider: input.provider,
    user: key,
    email: input.email,
    time: (/* @__PURE__ */ new Date()).toISOString().replace(/\.[0-9]*/, "")
  };
  let user = input.user;
  if (input.store !== false) {
    const existing = await settings.store.get(key);
    user = { ...existing ?? {}, ...input.user };
  }
  user = await cleanUser(user);
  if (input.store !== false) await settings.store.set(key, user);
  if (!strategy.includes("jwt")) {
    await settings.session.set(auth2.id, auth2, { expires: "1w" });
  }
  if (strategy.includes("jwt")) {
    const token = await signJwt(auth2, ctx.options.secret, 7 * 24 * 60 * 60);
    return status(201).json({ ...user, token });
  }
  if (strategy.includes("token")) {
    return status(201).json({ ...user, token: auth2.id });
  }
  if (strategy.includes("cookie")) {
    return cookies("authentication", {
      value: auth2.id,
      path: "/",
      httpOnly: true,
      secure: ctx.platform.production,
      sameSite: "Lax"
    }).redirect(settings.redirect);
  }
  if (strategy.includes("key")) throw new Error("Key auth not supported yet");
  throw new Error("Unknown auth type");
}

// src/helpers/createCookies.ts
var EXPIRED2 = (/* @__PURE__ */ new Date(0)).toUTCString();
var times = /(-?(?:\d+\.?\d*|\d*\.?\d+)(?:e[-+]?\d+)?)\s*([\p{L}]*)/iu;
parse.millisecond = parse.ms = 1e-3;
parse.second = parse.sec = parse.s = parse[""] = 1;
parse.minute = parse.min = parse.m = parse.s * 60;
parse.hour = parse.hr = parse.h = parse.m * 60;
parse.day = parse.d = parse.h * 24;
parse.week = parse.wk = parse.w = parse.d * 7;
parse.year = parse.yr = parse.y = parse.d * 365.25;
parse.month = parse.b = parse.y / 12;
function parse(str) {
  if (str === null || str === void 0) return null;
  if (typeof str === "number") return str;
  if (typeof str !== "string") {
    throw new Error(`Not a string: ${str} (${typeof str})`);
  }
  str = str.toLowerCase().replace(/[,_]/g, "");
  const [_, value, units] = times.exec(str) || [];
  if (!units) return null;
  const unitValue = parse[units] || parse[units.replace(/s$/, "")];
  if (!unitValue) return null;
  const result = unitValue * parseFloat(value);
  return Math.abs(Math.round(result * 1e3));
}
function normalizeExpires(expires) {
  if (expires === null || expires === void 0) return void 0;
  if (expires === 0) return EXPIRED2;
  if (typeof expires === "string") {
    if (/^[\d._]+\w+$/.test(expires)) {
      return new Date(Date.now() + parse(expires)).toUTCString();
    } else {
      return expires;
    }
  }
  if (typeof expires === "number") {
    return new Date(Date.now() + expires).toUTCString();
  }
  if (expires instanceof Date) {
    return expires.toUTCString();
  }
  return void 0;
}
function createCookies(key, val) {
  if (val.value === null) val.expires = EXPIRED2;
  const { value, path: path2, expires, maxAge, httpOnly, secure, sameSite } = val;
  let str = `${key}=${value || ""};Path=${path2 || "/"}`;
  if (typeof expires !== "undefined") str += `;Expires=${normalizeExpires(expires)}`;
  if (typeof maxAge === "number") str += `;Max-Age=${maxAge}`;
  if (httpOnly) str += ";HttpOnly";
  if (secure) str += ";Secure";
  if (sameSite) str += `;SameSite=${sameSite}`;
  return str;
}

// src/auth/state.ts
var NAME = "oauth_state";
function startState(ctx, crossSite = false) {
  const state = createId();
  return {
    state,
    cookie: {
      value: state,
      path: "/",
      expires: "10m",
      httpOnly: true,
      secure: crossSite || ctx.platform.production,
      sameSite: crossSite ? "None" : "Lax"
    }
  };
}
function checkState(ctx, received) {
  const expected = ctx.cookies[NAME];
  if (!expected || !received || expected !== received) {
    throw ServerError_default.AUTH_INVALID_STATE();
  }
}
function clearState() {
  return createCookies(NAME, { value: null });
}

// src/auth/providers/apple.ts
var AUTHORIZE = "https://appleid.apple.com/auth/authorize";
var TOKEN = "https://appleid.apple.com/auth/token";
var b64url2 = (data) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var b64urlJson = (segment) => {
  let b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - b64.length % 4) % 4);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};
var clientSecret = async () => {
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" };
  const payload = {
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 3600,
    aud: "https://appleid.apple.com",
    sub: env.APPLE_ID
  };
  const data = `${b64url2(JSON.stringify(header))}.${b64url2(JSON.stringify(payload))}`;
  const pem = String(env.APPLE_PRIVATE_KEY).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(data)
  );
  return `${data}.${b64url2(new Uint8Array(sig))}`;
};
var login = (ctx) => {
  const { state, cookie } = startState(ctx, true);
  const params = new URLSearchParams({
    client_id: env.APPLE_ID,
    redirect_uri: `${ctx.url.origin}/auth/callback/apple`,
    response_type: "code",
    scope: "name email",
    // Requesting scopes forces Apple to POST the result back (form_post)
    response_mode: "form_post",
    state
  });
  return cookies("oauth_state", cookie).redirect(`${AUTHORIZE}?${params}`);
};
var callback = async (ctx) => {
  const body = ctx.body || {};
  checkState(ctx, body.state);
  const tokenRes = await fetch(TOKEN, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.APPLE_ID,
      client_secret: await clientSecret(),
      code: body.code,
      grant_type: "authorization_code",
      redirect_uri: `${ctx.url.origin}/auth/callback/apple`
    })
  });
  if (!tokenRes.ok) throw new Error("apple: token exchange failed");
  const token = await tokenRes.json();
  const claims = b64urlJson(token.id_token.split(".")[1]);
  let name;
  if (body.user) {
    const parsed = JSON.parse(body.user).name;
    if (parsed) name = `${parsed.firstName} ${parsed.lastName}`.trim();
  }
  const res = await finishLogin(ctx, {
    provider: "apple",
    key: claims.sub,
    email: claims.email,
    user: { id: claims.sub, name, email: claims.email }
  });
  res.headers.append("set-cookie", clearState());
  return res;
};
var apple_default = { login, callback };

// src/auth/providers/oauth.ts
function oauthProvider(config2) {
  const KEY = config2.name.toUpperCase();
  const callbackUrl = (ctx) => `${ctx.url.origin}/auth/callback/${config2.name}`;
  const login3 = (ctx) => {
    const { state, cookie } = startState(ctx);
    const params = new URLSearchParams({
      client_id: env[`${KEY}_ID`],
      redirect_uri: callbackUrl(ctx),
      response_type: "code",
      scope: config2.scope,
      state
    });
    return cookies("oauth_state", cookie).redirect(
      `${config2.authorizeUrl}?${params}`
    );
  };
  const callback3 = async (ctx) => {
    checkState(ctx, ctx.url.query.state);
    const tokenRes = await fetch(config2.tokenUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: env[`${KEY}_ID`],
        client_secret: env[`${KEY}_SECRET`],
        code: ctx.url.query.code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(ctx)
      })
    });
    if (!tokenRes.ok) throw new Error(`${config2.name}: token exchange failed`);
    const token = await tokenRes.json();
    const profileRes = await fetch(config2.profileUrl, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token.access_token}`
      }
    });
    if (!profileRes.ok) throw new Error(`${config2.name}: profile fetch failed`);
    const profile = config2.profile(await profileRes.json());
    const res = await finishLogin(ctx, {
      provider: config2.name,
      key: profile.id,
      email: profile.email,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        picture: profile.picture
      }
    });
    res.headers.append("set-cookie", clearState());
    return res;
  };
  return { login: login3, callback: callback3 };
}

// src/auth/providers/discord.ts
var discord_default = oauthProvider({
  name: "discord",
  authorizeUrl: "https://discord.com/oauth2/authorize",
  tokenUrl: "https://discord.com/api/oauth2/token",
  profileUrl: "https://discord.com/api/users/@me",
  scope: "identify email",
  profile: (p) => ({
    id: p.id,
    email: p.email,
    name: p.global_name || p.username,
    picture: p.avatar ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` : void 0
  })
});

// src/auth/updateUser.ts
async function updateUser(user, auth2, store) {
  if (auth2.provider === "email") {
    return await store.set(auth2.email, user);
  }
}

// src/auth/providers/email.ts
async function emailLogin(ctx) {
  const { email, password } = ctx.body;
  if (!email) throw ServerError_default.LOGIN_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError_default.LOGIN_INVALID_EMAIL();
  if (!password) throw ServerError_default.LOGIN_NO_PASSWORD();
  if (password.length < 8) throw ServerError_default.LOGIN_INVALID_PASSWORD();
  const store = ctx.options.auth.store;
  if (!await store.has(email)) throw ServerError_default.LOGIN_WRONG_EMAIL();
  const user = await store.get(email);
  const isValid = await verify(password, user.password);
  if (!isValid) throw ServerError_default.LOGIN_WRONG_PASSWORD();
  return finishLogin(ctx, {
    provider: "email",
    key: user.email,
    email: user.email,
    user,
    store: false
  });
}
async function emailRegister(ctx) {
  const { email, password, ...data } = ctx.body;
  if (!email) throw ServerError_default.REGISTER_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError_default.REGISTER_INVALID_EMAIL();
  if (!password) throw ServerError_default.REGISTER_NO_PASSWORD();
  if (password.length < 8) throw ServerError_default.REGISTER_INVALID_PASSWORD();
  const store = ctx.options.auth.store;
  if (await store.has(email)) throw ServerError_default.REGISTER_EMAIL_EXISTS();
  const time = (/* @__PURE__ */ new Date()).toISOString().replace(/\.[0-9]*/, "");
  const user = {
    id: createId(email),
    strategy: ctx.options.auth.strategy,
    provider: "email",
    email,
    password: await hash2(password),
    time,
    ...data
  };
  await store.set(email, user);
  return finishLogin(ctx, {
    provider: "email",
    key: email,
    email,
    user,
    store: false
  });
}
async function emailResetPassword() {
}
async function emailUpdatePassword(ctx) {
  const passwords = ctx.body;
  const fullUser = await ctx.options.auth.store.get(ctx.user.email);
  if (!fullUser) throw ServerError_default.AUTH_NO_USER();
  const isValid = await verify(passwords.previous, fullUser.password);
  if (!isValid) throw ServerError_default.LOGIN_WRONG_PASSWORD();
  fullUser.password = await hash2(passwords.updated);
  await updateUser(fullUser, ctx.user, ctx.options.auth.store);
  return 200;
}
var email_default = {
  login: emailLogin,
  register: emailRegister,
  reset: emailResetPassword,
  password: emailUpdatePassword
};

// src/auth/providers/facebook.ts
var facebook_default = oauthProvider({
  name: "facebook",
  authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
  profileUrl: "https://graph.facebook.com/me?fields=id,name,email,picture",
  scope: "email public_profile",
  profile: (p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    picture: p.picture?.data?.url
  })
});

// src/auth/providers/github.ts
var oauth = async (code) => {
  const fch = async (url, { body, headers: headers2 = {}, ...rest } = {}) => {
    headers2.accept = "application/json";
    headers2["content-type"] = "application/json";
    const res2 = await fetch(url, { ...rest, body, headers: headers2 });
    if (!res2.ok) throw new Error("Invalid request");
    return res2.json();
  };
  const res = await fch("https://github.com/login/oauth/access_token", {
    method: "post",
    body: JSON.stringify({
      client_id: env.GITHUB_ID,
      client_secret: env.GITHUB_SECRET,
      code
    })
  });
  return (path2) => {
    return fch(`https://api.github.com${path2}`, {
      headers: { Authorization: `Bearer ${res.access_token}` }
    });
  };
};
var login2 = (ctx) => {
  const { state, cookie } = startState(ctx);
  const params = new URLSearchParams({
    client_id: env.GITHUB_ID,
    scope: "user:email",
    state
  });
  return cookies("oauth_state", cookie).redirect(
    `https://github.com/login/oauth/authorize?${params}`
  );
};
var getUserProfile = async (code) => {
  const api = await oauth(code);
  const [profile, emails] = await Promise.all([
    api("/user"),
    api("/user/emails")
  ]);
  const email = emails.sort((a) => a.primary ? -1 : 1)[0]?.email;
  return { ...profile, email };
};
var callback2 = async (ctx) => {
  checkState(ctx, ctx.url.query.state);
  const profile = await getUserProfile(ctx.url.query.code);
  const res = await finishLogin(ctx, {
    provider: "github",
    key: profile.id,
    email: profile.email,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      picture: profile.avatar_url,
      location: profile.location,
      created: profile.created_at
    }
  });
  res.headers.append("set-cookie", clearState());
  return res;
};
var github_default = { login: login2, callback: callback2 };

// src/auth/providers/google.ts
var google_default = oauthProvider({
  name: "google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  scope: "openid email profile",
  profile: (p) => ({
    id: p.sub,
    email: p.email,
    name: p.name,
    picture: p.picture
  })
});

// src/auth/providers/microsoft.ts
var microsoft_default = oauthProvider({
  name: "microsoft",
  authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  profileUrl: "https://graph.microsoft.com/v1.0/me",
  scope: "openid email profile User.Read",
  profile: (p) => ({
    // Personal accounts expose `userPrincipalName` rather than `mail`
    id: p.id,
    email: p.mail || p.userPrincipalName,
    name: p.displayName
  })
});

// src/auth/providers/index.ts
var providers_default = {
  apple: apple_default,
  discord: discord_default,
  email: email_default,
  facebook: facebook_default,
  github: github_default,
  google: google_default,
  microsoft: microsoft_default
};

// src/auth/parseAuthOptions.ts
var defaultRedirect = "/user";
function defaultCleanUser(fullUser) {
  const { password: _password, ...user } = fullUser;
  return user;
}
var available = Object.keys(providers_default);
function parseAuthOptions(auth2, all) {
  if (!auth2) return null;
  if (typeof auth2 === "string") {
    const [strategy2, provider] = auth2.split(":");
    auth2 = { strategy: strategy2, providers: provider ? [provider] : [] };
  }
  if (!auth2.strategy?.length) {
    throw new Error("Auth options needs a strategy");
  }
  const strategy = auth2.strategy;
  if (strategy === "key") {
    const key = auth2.key || env.AUTH_KEY;
    if (!key) {
      throw new Error("`key` auth needs the AUTH_KEY env var (or auth.key)");
    }
    return {
      strategy,
      providers: [],
      key,
      redirect: auth2.redirect || defaultRedirect,
      cleanUser: auth2.cleanUser || defaultCleanUser
    };
  }
  const list = Array.isArray(auth2.providers) ? auth2.providers : auth2.providers ? [auth2.providers] : [];
  if (!list.length) {
    throw new Error("Auth options needs a provider");
  }
  const invalid = list.find((p) => !available.includes(p));
  if (invalid) {
    throw new Error(
      `Provider "${invalid}" not found, available ones are "${available.join('", "')}"`
    );
  }
  const redirect2 = auth2.redirect || defaultRedirect;
  const cleanUser = auth2.cleanUser || defaultCleanUser;
  if (!auth2.store && !all.store) {
    throw new Error("Need a userStore store for Auth");
  }
  if (!auth2.session && !all.store) {
    throw new Error("Need a sessionStore store for Auth");
  }
  const store = auth2.store || all.store.prefix("user:");
  const session2 = auth2.session || all.store.prefix("auth:");
  return {
    strategy,
    providers: list,
    redirect: redirect2,
    cleanUser,
    store,
    session: session2
  };
}

// src/helpers/color.ts
var map = {
  reset: 0,
  bright: 1,
  dim: 2,
  under: 4,
  blink: 5,
  reverse: 7,
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  bgblack: 40,
  bgred: 41,
  bggreen: 42,
  bgyellow: 43,
  bgblue: 44,
  bgmagenta: 45,
  bgcyan: 46,
  bgwhite: 47
};
var replace = (k) => {
  if (process.env.NO_COLOR) return "";
  if (!(k in map)) throw new Error(`"{${k}}" is not a valid color`);
  return `\x1B[${map[k]}m`;
};
function color(str, ...vals) {
  if (typeof str === "string") {
    return str.replace(/\{(\w+)\}/g, (_m, k) => replace(k)).replace(/\{\/\w*\}/g, () => replace("reset"));
  }
  return color(str[0] + vals.map((v, i) => v + str[i + 1]).join(""));
}

// src/helpers/logger.ts
var STATUS_TEXT = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable"
};
var UNITS = ["b", "kb", "mb", "gb", "tb"];
function formatBytes(bytes) {
  if (!bytes || bytes < 0) return "0b";
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1
  );
  const value = bytes / 1024 ** i;
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${UNITS[i]}`;
}
var SCOPE_COLORS = {
  start: "green",
  api: "cyan"
};
var MODULE_COLOR = "magenta";
var paint = (name, text) => `${color(`{${name}}`)}${text}${color("{/}")}`;
function createLogger(level) {
  const enabled = !!level;
  const message = (scope, msg) => {
    if (!enabled) return;
    const c = SCOPE_COLORS[scope] || MODULE_COLOR;
    console.log(paint(c, `[server:${scope}] ${msg}`));
  };
  const request = (ctx, res) => {
    if (!enabled) return;
    const method = ctx.method.toUpperCase();
    const path2 = ctx.url.pathname;
    const reqLen = Number(ctx.headers["content-length"]) || 0;
    const resLen = Number(res.headers.get("content-length")) || 0;
    const status2 = res.status;
    const text = STATUS_TEXT[status2] || "";
    const reqSize = reqLen ? ` ${formatBytes(reqLen)}` : "";
    const resSize = resLen ? ` ${formatBytes(resLen)}` : "";
    let line = `${method} ${path2}${reqSize} \u2192 ${status2}${text ? ` ${text}` : ""}${resSize}`;
    const location = res.headers.get("location");
    if (location) line += ` \u2192 ${location}`;
    message("api", line);
  };
  return {
    level,
    message,
    start: (url) => message("start", url),
    request
  };
}

// src/helpers/security.ts
function resolveSecurity(security) {
  const off = security === false;
  const o = security && typeof security === "object" ? security : {};
  const val = (v, def) => v === false ? null : v === true || v == null ? def : v;
  const map2 = off ? {} : {
    "x-frame-options": val(o.frameguard, "SAMEORIGIN"),
    "x-content-type-options": o.noSniff === false ? null : "nosniff",
    "referrer-policy": val(
      o.referrerPolicy,
      "strict-origin-when-cross-origin"
    ),
    "x-xss-protection": o.xssProtection === false ? null : "0",
    // Opt-in: default off
    "content-security-policy": val(o.csp, null),
    "cross-origin-opener-policy": val(o.coop, null),
    "cross-origin-resource-policy": val(o.corp, null),
    "permissions-policy": o.permissionsPolicy ?? null
  };
  const headers2 = {};
  for (const key in map2) {
    const value = map2[key];
    if (value) headers2[key] = value;
  }
  return {
    trustProxy: o.trustProxy ?? true,
    headers: headers2,
    hsts: off ? null : val(o.hsts, "max-age=15552000; includeSubDomains")
  };
}
function applySecurity(res, ctx) {
  const security = ctx.options.security;
  if (!security) return;
  for (const key in security.headers) {
    if (!res.headers.has(key)) res.headers.set(key, security.headers[key]);
  }
  if (security.hsts && ctx.platform.production && !res.headers.has("strict-transport-security")) {
    res.headers.set("strict-transport-security", security.hsts);
  }
}

// src/helpers/config.ts
function config(options = {}) {
  const env2 = globalThis.env;
  const raw = options.log ?? env2.LOG_LEVEL;
  const level = raw === true ? "info" : raw === false ? void 0 : raw;
  const log = createLogger(level);
  const settings = {
    port: options.port || env2.PORT || 3e3,
    secret: options.secret || env2.SECRET || `unsafe-${createId()}`,
    log,
    // How request bodies are read: parsed into ctx.body by default; `raw` keeps
    // the Buffer, `stream` hands the handler the unread web ReadableStream.
    body: options.body ?? "parse",
    // Secure-by-default response headers + trustProxy for ctx.ip. `false` turns
    // the added headers off; see resolveSecurity for the defaults.
    security: resolveSecurity(options.security)
  };
  options.cors = options.cors || env2.CORS || null;
  if (options.cors) {
    const cors2 = {
      origin: "",
      methods: "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
      headers: "*"
    };
    if (options.cors === true) {
      cors2.origin = true;
    } else if (typeof options.cors === "string") {
      cors2.origin = options.cors;
    } else if (Array.isArray(options.cors)) {
      cors2.origin = options.cors.join(",");
    } else if (typeof options.cors === "object") {
      if (!options.cors.origin) {
        cors2.origin = "*";
      } else if (typeof options.cors.origin === "string") {
        cors2.origin = options.cors.origin;
      } else if (Array.isArray(options.cors.origin)) {
        cors2.origin = options.cors.origin.join(",");
      }
      if ("methods" in options.cors) {
        cors2.methods = Array.isArray(options.cors.methods) ? options.cors.methods.join(",") : options.cors.methods;
      }
      if ("headers" in options.cors) {
        cors2.headers = Array.isArray(options.cors.headers) ? options.cors.headers.join(",") : options.cors.headers;
      }
      if (options.cors.credentials) {
        cors2.credentials = true;
      }
    }
    if (typeof cors2.origin === "string") {
      cors2.origin = cors2.origin.toLowerCase();
    }
    settings.cors = cors2;
  }
  settings.public = options.public ? bucket(options.public) : null;
  settings.uploads = options.uploads instanceof UploadPipeline ? options.uploads : options.uploads ? bucket(options.uploads) : null;
  if (options.favicon) settings.favicon = options.favicon;
  settings.store = options.store ?? null;
  settings.cookies = options.cookies ?? null;
  if (options.session) {
    settings.session = "store" in options.session ? options.session : { store: options.session };
  }
  if (options.store && !options.session) {
    settings.session = { store: options.store.prefix("session:") };
  }
  if (options.auth || env2.AUTH) {
    settings.auth = parseAuthOptions(options.auth || env2.AUTH || null, options);
  }
  if (settings.auth?.strategy.includes("jwt") && settings.secret.startsWith("unsafe-")) {
    console.warn(
      "[server:auth] jwt strategy with no SECRET set: tokens are signed with a random per-process secret, so they break on restart and across instances. Set the SECRET environment variable (or the `secret` option)."
    );
  }
  if (options.openapi) {
    if (options.openapi === true) {
      settings.openapi = {};
    }
  }
  settings.onError = options.onError || ((error) => {
    return new Response(error.message || "Server Error", {
      status: error.status || 500
    });
  });
  const loc = (v) => typeof v === "string" ? v : "enabled";
  if (settings.auth) {
    log.message("auth", `${settings.auth.providers.join(", ")} auth enabled`);
  }
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (settings.session) log.message("session", "enabled");
  if (settings.cors) {
    const origin = settings.cors.origin === true ? "*" : String(settings.cors.origin);
    log.message("cors", origin);
  }
  if (settings.favicon) log.message("favicon", loc(settings.favicon));
  if (settings.openapi) log.message("openapi", settings.openapi.path || "/docs");
  return settings;
}

// src/helpers/cors.ts
var localhost = /^https?:\/\/localhost(:\d+)?$/;
function cors(config2, origin = "") {
  origin = origin?.toLowerCase();
  if (config2 === true) return origin || null;
  if (config2 === "*") return "*";
  if (!origin) return null;
  if (localhost.test(origin)) return origin;
  const arr = Array.isArray(config2) ? config2 : typeof config2 === "string" ? config2.split(/\s*,\s*/g) : [];
  if (arr.includes(origin)) return origin;
  console.warn(`CORS: Origin "${origin}" not allowed. Allowed "${config2}"`);
  return null;
}
function applyCors(res, ctx) {
  const settings = ctx.options.cors;
  if (!settings) return;
  const requestOrigin = ctx.headers.origin || "";
  let origin = cors(settings.origin, requestOrigin);
  if (!origin) return;
  if (settings.credentials && origin === "*") {
    if (!requestOrigin) return;
    origin = requestOrigin.toLowerCase();
  }
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", settings.methods);
  res.headers.set("Access-Control-Allow-Headers", settings.headers);
  if (settings.credentials) {
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  if (origin !== "*") res.headers.append("Vary", "Origin");
  if (ctx.method === "options") {
    res.headers.set("Access-Control-Max-Age", "86400");
  }
}

// src/helpers/etag.ts
function etag(bytes) {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return `"${bytes.length.toString(16)}-${(h >>> 0).toString(16)}"`;
}

// src/helpers/createWebsocket.ts
function createWebsocket(sockets, handlers) {
  const run = (event, socket, body) => {
    const routes = handlers.socket?.filter((r2) => r2.path === event) ?? [];
    const user = socket.user ?? socket.data?.user;
    for (const route of routes) {
      for (const fn of route.fns) {
        fn({ socket, sockets, body, user });
      }
    }
  };
  return {
    message: (socket, body) => run("message", socket, body),
    open: (socket) => {
      sockets.push(socket);
      run("open", socket);
    },
    close: (socket) => {
      sockets.splice(sockets.indexOf(socket), 1);
      run("close", socket);
    }
  };
}

// src/helpers/define.ts
function define(obj, key, cb) {
  Object.defineProperty(obj, key, {
    configurable: true,
    get() {
      const value = cb(obj);
      Object.defineProperty(obj, key, {
        configurable: true,
        writable: true,
        value
      });
      return obj[key];
    }
  });
}

// src/helpers/getMachine.ts
function getProvider() {
  if (typeof globalThis.Netlify !== "undefined") return "netlify";
  return null;
}
function getRuntime() {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof globalThis.Deno !== "undefined") return "deno";
  if (globalThis.process?.versions?.node) return "node";
  return null;
}
function getProduction() {
  if (typeof globalThis.Netlify !== "undefined")
    return globalThis.Netlify.env.get("NETLIFY_DEV") !== "true";
  return process.env.NODE_ENV === "production";
}
function getMachine() {
  return {
    provider: getProvider(),
    runtime: getRuntime(),
    production: getProduction()
  };
}

// src/parseResponse.ts
async function parseResponse(out, ctx) {
  if (!out && typeof out !== "string") return null;
  if (typeof out === "function") {
    out = await out(ctx);
  }
  if (out instanceof Blob) {
    out = new Response(out, { headers: { "Content-Type": out.type } });
  }
  if (out instanceof ReadableStream) {
    out = new Response(out);
  }
  if (out instanceof Uint8Array) {
    out = new Response(out);
  }
  if (typeof out === "number") {
    out = new Response(void 0, { status: out });
  }
  if (typeof out === "string") {
    const type2 = /^\s*</.test(out) ? "text/html" : "text/plain";
    out = new Response(out, {
      headers: {
        "content-type": type2,
        "content-length": String(Buffer.byteLength(out))
      }
    });
  }
  if (out?.constructor === Object || Array.isArray(out)) {
    out = json(out);
  }
  if (out[Symbol.iterator]) {
    out = new Response(iteratorToReadable(out));
  }
  if (out[Symbol.asyncIterator] && !(out instanceof Response)) {
    out = new Response(iteratorAsyncToReadable(out));
  }
  if (out instanceof Response && out.url && out.body) {
    out = new Response(out.body, {
      status: out.status,
      headers: out.headers
    });
    if (/^(br|gzip)$/.test(out.headers.get("content-encoding") || "")) {
      out.headers.delete("content-encoding");
    }
  }
  if (!(out instanceof Response)) {
    throw new Error(`Invalid response type ${out}`);
  }
  applyCors(out, ctx);
  applySecurity(out, ctx);
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }
  if (Object.keys(ctx.session || {}).length) {
    if (!ctx.options.session?.store) {
      throw ServerError_default.NO_STORE();
    }
    let id = ctx.cookies.session;
    if (!id) {
      id = createId();
      out.headers.append(
        "set-cookie",
        createCookies("session", {
          value: id,
          path: "/",
          httpOnly: true,
          secure: ctx.platform.production,
          sameSite: "Lax"
        })
      );
    }
    ctx.options.session.store.set(id, ctx.session);
  }
  if (ctx.options.cookies) {
    if (Object.keys(ctx.res?.cookies || {}).length) {
      for (const cookie of Object.values(ctx.res.cookies)) {
        ctx.res.headers.append("set-cookie", cookie);
      }
    }
  }
  if (ctx?.res?.headers) {
    for (const key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }
  return out;
}

// src/pathPattern.ts
function pathPattern(pattern, path2) {
  if (pattern === "*" && path2 === "/") return {};
  pattern = `/${pattern.replace(/^\//, "")}`;
  pattern = pattern.replace(/\/$/, "") || "/";
  path2 = path2.replace(/\/$/, "") || "/";
  if (pattern === path2) return {};
  const params = {};
  const pathParts = path2.split("/").slice(1).map((u) => decodeURIComponent(u));
  const pattParts = pattern.split("/").slice(1);
  let allSame = true;
  for (let i = 0; i < Math.max(pathParts.length, pattParts.length); i++) {
    const patt = pattParts[i] || "";
    const part = pathParts[i] || "";
    const last = pattParts[pattParts.length - 1];
    const key = patt.replace(/^:/, "").replace(/\?$/, "").replace(/\(\w*\)/, "");
    if (patt === part) continue;
    if (patt.endsWith("?") && !part) continue;
    if (patt.startsWith(":")) {
      params[key] = part;
      if (/\(\w*\)/.test(patt)) {
        if (patt.includes("(number)")) {
          const value = Number(part);
          params[key] = Number.isNaN(value) ? void 0 : value;
        }
        if (patt.includes("(date)")) {
          const value = new Date(part);
          params[key] = Number.isNaN(value.getTime()) ? void 0 : value;
        }
      }
      continue;
    }
    if (!patt && last === "*" && part || patt === "*" && part) {
      params["*"] = params["*"] || [];
      params["*"].push(part);
      continue;
    }
    allSame = false;
  }
  if (allSame) return params;
  return null;
}

// src/helpers/validate.ts
function validate(ctx, schema) {
  if (!schema || typeof schema !== "object") return;
  let base;
  try {
    if (typeof schema?.body === "function") {
      base = "body";
      schema.body(ctx.body || {});
    }
    if (typeof schema?.body?.parse === "function") {
      base = "body";
      schema.body.parse(ctx.body || {});
    }
    if (typeof schema?.query === "function") {
      base = "query";
      schema.query(ctx.url.query || {});
    }
    if (typeof schema?.query?.parse === "function") {
      base = "query";
      schema.query.parse(ctx.url.query || {});
    }
  } catch (error) {
    if (error.name === "ZodError" || error.constructor.name === "ZodError") {
      const message = error.issues.map(
        ({ path: path2, message: message2 }) => `[${base}.${path2.join(".")}]: ${message2}`
      ).sort().join("\n");
      throw new StatusError(message, 422);
    }
    throw error;
  }
}

// src/helpers/handleRequest.ts
async function handleRequest(app, ctx) {
  const res = await getResponse(app, ctx);
  if (res) ctx.options.log.request(ctx, res);
  return res;
}
async function getResponse(app, ctx) {
  try {
    let matched = false;
    for (const route of app.handlers[ctx.method]) {
      const params = pathPattern(route.path, ctx.url.pathname || "/");
      if (!params) continue;
      matched = true;
      define(ctx.url, "params", () => params);
      if (Object.keys(route.options).length) {
        ctx.options = { ...app.settings, ...route.options };
      }
      ctx.body = await resolveBody(ctx, ctx.options.body);
      for (const cb of route.fns) {
        if (typeof cb === "function") {
          const res = await cb(ctx);
          const out = await parseResponse(res, ctx);
          if (out) return out;
        } else {
          validate(ctx, cb);
        }
      }
      break;
    }
    if (!matched) {
      ctx.body = await resolveBody(ctx, ctx.options.body);
      for (const mw of app.middleware) {
        const out = await parseResponse(await mw(ctx), ctx);
        if (out) return out;
      }
    }
    if (ctx.platform.provider === "netlify") return;
    throw new ServerError_default("NOT_FOUND", 404, "Not Found");
  } catch (error) {
    const res = await ctx.options.onError(error, ctx);
    applyCors(res, ctx);
    applySecurity(res, ctx);
    return res;
  }
}

// src/helpers/hash.ts
import * as crypto2 from "crypto";
import { getRandomValues } from "crypto";
import { promisify } from "util";
async function hash2(password) {
  if ("argon2" in crypto2) {
    const argon23 = promisify(crypto2.argon2);
    const buf = await argon23("argon2id", {
      message: Buffer.from(password),
      nonce: getRandomValues(new Uint8Array(16)),
      parallelism: 4,
      tagLength: 64,
      memory: 65536,
      passes: 3
    });
    return buf.toString("base64");
  }
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3
  });
}

// src/helpers/iterate.ts
async function iterate(stream, cb) {
  const reader = stream.getReader();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done || !chunk.value) return;
    cb(chunk.value);
  }
}

// src/helpers/iteratorAsyncToReadable.ts
function iteratorAsyncToReadable(asyncGenerator) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await asyncGenerator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(new TextEncoder().encode(value));
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
    cancel() {
      console.log("Stream cancelled");
    }
  });
}

// src/helpers/iteratorToReadable.ts
function iteratorToReadable(generator) {
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });
}

// src/helpers/parseCookies.ts
function parseCookies(cookies2) {
  if (!cookies2) return {};
  const cookieStr = Array.isArray(cookies2) ? cookies2[0] : cookies2;
  if (!cookieStr) return {};
  return Object.fromEntries(
    cookieStr.split(/;\s*/).map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );
}

// src/helpers/parseHeaders.ts
var parseHeaders_default = (raw) => {
  const headers2 = {};
  raw.forEach((value, originalKey) => {
    const key = originalKey.toLowerCase();
    if (headers2[key]) {
      if (!Array.isArray(headers2[key])) {
        headers2[key] = [headers2[key]];
      }
      headers2[key].push(value);
    } else {
      headers2[key] = value;
    }
  });
  return headers2;
};

// src/helpers/toWeb.ts
function toWeb(nodeStream) {
  if (typeof ReadableStream === "undefined") {
    throw new Error("Environment not supported, please report this as a bug");
  }
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}

// src/helpers/verify.ts
import * as crypto3 from "crypto";
function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ca = a.charCodeAt(i) || 0;
    const cb = b.charCodeAt(i) || 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}
async function verify(password, hash3) {
  if ("Bun" in globalThis) {
    return Bun.password.verify(password, hash3, "argon2id");
  }
  const match = /^\$argon2(id|i|d)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(
    hash3
  );
  if (!match) throw new Error("Invalid Argon2 hash format");
  const [, variant, , memory, passes, parallelism, saltB64, hashB64] = match;
  const nonce = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  return new Promise((resolve2, reject) => {
    crypto3.argon2(
      `argon2${variant}`,
      {
        message: password,
        nonce,
        memory: parseInt(memory, 10),
        passes: parseInt(passes, 10),
        parallelism: parseInt(parallelism, 10),
        tagLength: expected.length
      },
      (err, derivedKey) => {
        if (err) return reject(err);
        if (derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected)) {
          resolve2(true);
        } else {
          resolve2(false);
        }
      }
    );
  });
}

// src/helpers/safeEqual.ts
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// src/auth/findSessionId.ts
var validateToken = (authorization) => {
  const [type2, id] = authorization.trim().split(" ");
  if (type2?.toLowerCase() !== "bearer") {
    throw ServerError_default.AUTH_INVALID_HEADER({ type: type2 });
  }
  if (id?.length !== 16) {
    throw ServerError_default.AUTH_INVALID_TOKEN();
  }
  return id;
};
var validateCookie = (authorization) => {
  if (authorization.length !== 16) {
    throw ServerError_default.AUTH_INVALID_COOKIE();
  }
  return authorization;
};
function findSessionId(ctx) {
  const strategy = ctx.options.auth.strategy;
  if (!strategy) throw new Error(`Invalid strategy "${strategy}"`);
  if (strategy.includes("token")) {
    if (!ctx.headers.authorization) return;
    return validateToken(ctx.headers.authorization);
  }
  if (strategy.includes("cookie")) {
    if (!ctx.cookies.authentication) return;
    return validateCookie(ctx.cookies.authentication);
  }
  throw new Error(`Invalid auth type "${strategy}"`);
}

// src/auth/getUser.ts
function getKeyUser(ctx) {
  const expected = ctx.options.auth.key;
  const header = ctx.headers.authorization;
  if (!header) return;
  const [type2, provided] = header.trim().split(" ");
  if (type2?.toLowerCase() !== "bearer" || !provided) {
    throw ServerError_default.AUTH_INVALID_HEADER({ type: type2 });
  }
  if (!expected || !safeEqual(provided, expected)) {
    throw ServerError_default.AUTH_INVALID_TOKEN();
  }
  return { id: "key", strategy: "key", provider: "key" };
}
async function getAuthSession(ctx) {
  const strategy = ctx.options.auth.strategy;
  if (strategy.includes("jwt")) {
    const header = ctx.headers.authorization;
    if (!header) return;
    const [type2, token] = header.trim().split(" ");
    if (type2?.toLowerCase() !== "bearer" || !token) {
      throw ServerError_default.AUTH_INVALID_HEADER({ type: type2 });
    }
    const payload = await verifyJwt(token, ctx.options.secret);
    if (!payload) throw ServerError_default.AUTH_INVALID_TOKEN();
    return payload;
  }
  const id = findSessionId(ctx);
  if (!id) return;
  return ctx.options.auth.session.get(id);
}
async function getUser(ctx) {
  if (!ctx.options.auth) return;
  const options = ctx.options.auth;
  if (options.strategy === "key") return getKeyUser(ctx);
  const auth2 = await getAuthSession(ctx);
  if (!auth2) return;
  if (options.strategy !== auth2.strategy) {
    throw ServerError_default.AUTH_INVALID_STRATEGY({
      strategy: auth2.strategy || "undefined",
      valid: options.strategy
    });
  }
  if (!options.providers.includes(auth2.provider)) {
    throw ServerError_default.AUTH_INVALID_PROVIDER({
      provider: auth2.provider,
      valid: options.providers
    });
  }
  const user = await ctx.options.auth.store.get(auth2.user);
  if (!user) throw ServerError_default.AUTH_NO_USER();
  user.strategy = auth2.strategy;
  user.provider = auth2.provider;
  return ctx.options.auth.cleanUser(user);
}

// src/auth/logout.ts
async function logout(ctx) {
  const { strategy } = ctx.user;
  if (!strategy) throw new Error(`Invalid strategy "${strategy}"`);
  if (!strategy.includes("jwt")) {
    await ctx.options.auth.session.del(findSessionId(ctx));
  }
  if (strategy.includes("token") || strategy.includes("jwt")) {
    return { token: null };
  }
  if (strategy.includes("cookie")) {
    return cookies({ authentication: null }).redirect("/");
  }
  if (strategy.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
}

// src/auth/index.ts
var oauth2 = [
  "github",
  "google",
  "microsoft",
  "discord",
  "facebook"
];
function auth(app) {
  app.use(async function middle(ctx) {
    ctx.user = await getUser(ctx);
  });
  if (app.settings.auth.strategy === "key") return;
  app.post("/auth/logout", logout);
  const enabled = app.settings.auth.providers;
  for (const name of oauth2) {
    if (!enabled.includes(name)) continue;
    const key = name.toUpperCase();
    if (!env[`${key}_ID`]) throw new Error(`${key}_ID not defined`);
    if (!env[`${key}_SECRET`]) throw new Error(`${key}_SECRET not defined`);
    app.get(`/auth/login/${name}`, providers_default[name].login);
    app.get(`/auth/callback/${name}`, providers_default[name].callback);
  }
  if (enabled.includes("apple")) {
    const keys = ["APPLE_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"];
    for (const key of keys) {
      if (!env[key]) throw new Error(`${key} not defined`);
    }
    app.get("/auth/login/apple", providers_default.apple.login);
    app.post("/auth/callback/apple", providers_default.apple.callback);
  }
  if (enabled.includes("email")) {
    app.post("/auth/register/email", providers_default.email.register);
    app.post("/auth/login/email", providers_default.email.login);
    app.put("/auth/password/email", providers_default.email.password);
    app.put("/auth/reset/email", providers_default.email.reset);
  }
}

// src/helpers/parseRange.ts
function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;
  let start;
  let end;
  if (rawStart === "") {
    const n = Number(rawEnd);
    if (n <= 0) return "unsatisfiable";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (size === 0 || start > end || start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}

// src/middle/assets.ts
var CACHE_CONTROL = "public, max-age=3600";
async function assets(ctx) {
  if (!ctx.options.public) return;
  if (ctx.method !== "get") return;
  if (ctx.url.pathname === "/") return;
  try {
    const key = ctx.url.pathname.replace(/^\/+/, "");
    const file2 = ctx.options.public.file(key);
    const meta = file2.info ? await file2.info() : null;
    if (meta ? !meta.exists : !await file2.exists()) return;
    const ext2 = ctx.url.pathname.split(".").pop();
    const ctype = meta?.type || ext2;
    const headers2 = { "cache-control": CACHE_CONTROL };
    let tag;
    if (meta) {
      const stamp = meta.date ? meta.date.getTime() : 0;
      tag = `W/"${meta.size.toString(16)}-${stamp.toString(16)}"`;
      headers2.etag = tag;
      if (meta.date) headers2["last-modified"] = meta.date.toUTCString();
    }
    const canRange = !!(meta && file2.slice);
    if (canRange) headers2["accept-ranges"] = "bytes";
    if (tag && ctx.headers["if-none-match"] === tag) {
      return status(304).headers(headers2).send();
    }
    const rangeHeader = ctx.headers.range;
    const ifRange = ctx.headers["if-range"];
    if (meta && file2.slice && rangeHeader && (!ifRange || ifRange === tag)) {
      const range = parseRange(rangeHeader, meta.size);
      if (range === "unsatisfiable") {
        return status(416).headers({ ...headers2, "content-range": `bytes */${meta.size}` }).send();
      }
      if (range) {
        const { start, end } = range;
        return type(ctype).status(206).headers({
          ...headers2,
          "content-range": `bytes ${start}-${end}/${meta.size}`,
          "content-length": String(end - start + 1)
        }).send(file2.slice(start, end + 1).stream());
      }
    }
    return type(ctype).headers(headers2).send(file2.stream());
  } catch {
  }
}

// src/middle/favicon.ts
var CACHE_CONTROL2 = "public, max-age=86400";
var ext = (name) => name.split(".").pop() || "ico";
async function loadFavicon(fav) {
  try {
    const type2 = ext(typeof fav === "string" ? fav : fav?.name);
    const bytes = typeof fav === "string" ? await (await import("fs/promises")).readFile(fav) : Buffer.from(await fav.bytes());
    return { bytes, type: type2, etag: etag(bytes) };
  } catch {
    return null;
  }
}
async function favicon(ctx) {
  const fav = ctx.options.favicon;
  if (!fav) return;
  if (ctx.app.faviconCache === void 0) {
    ctx.app.faviconCache = await loadFavicon(fav);
  }
  const entry = ctx.app.faviconCache;
  if (!entry) return 204;
  const headers2 = { "cache-control": CACHE_CONTROL2, etag: entry.etag };
  if (ctx.headers["if-none-match"] === entry.etag) {
    return status(304).headers(headers2).send();
  }
  return type(entry.type).headers(headers2).send(entry.bytes);
}

// src/middle/openapi.ts
import * as fsp2 from "fs/promises";
var entities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
var encode = (str = "") => {
  if (typeof str === "number") str = String(str);
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"]/g, (tag) => entities[tag]);
};
var getConfig = (options = {}) => {
  const config2 = { ...options };
  if (config2.tags) {
    if (typeof config2.tags === "string") {
      config2.tags = config2.tags.split(/\s*,\s*/g);
    }
    if (!Array.isArray(config2.tags)) {
      throw new Error("invalid tags");
    }
    config2.tags = config2.tags.map((t) => t.trim());
  }
  return config2;
};
function zodToSchema(schema) {
  const type2 = schema?.def?.type || "string";
  if (type2 === "object") {
    const shape = schema.def.shape;
    const properties = {};
    const req = [];
    for (const key in shape) {
      const field = shape[key];
      properties[key] = zodToSchema(field);
      if (!field.isOptional() && !field.isNullable()) {
        req.push(key);
      }
    }
    const required = req.length ? req : void 0;
    return { type: type2, properties, required };
  }
  if (type2 === "array") {
    return { type: type2, items: zodToSchema(schema.def.element) };
  }
  return { type: type2 };
}
var pkgProm = fsp2.readFile("package.json", "utf-8").then((data) => JSON.parse(data)).catch(() => ({}));
var getTag = (name, fn) => {
  const found = fn.toString().split("\n").filter((l) => /\s+\/\/\s/.test(l)).map((l) => l.trim().replace("// ", "")).find((l) => l.startsWith(name));
  if (!found) return "";
  return encode(found.replace(name, "").trim());
};
var getDescription = (fn) => getTag("@description", fn) || "";
var getReturn = (fn) => getTag("@returns", fn) || "OK";
var generateOpenApiPaths = (handlers) => {
  const paths = {};
  for (const [method, routes] of Object.entries(handlers)) {
    for (const route of routes) {
      const path2 = route.path;
      const fn = route.fns.find((p) => typeof p === "function");
      const meta = route.fns.find((p) => typeof p === "object");
      const config2 = getConfig(route.options);
      if (typeof path2 !== "string" || path2 === "*" || path2 === "/docs" || !fn) {
        continue;
      }
      const normalizedPath = path2.replace(/\(\w+\)/gi, "").replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      if (!paths[normalizedPath]) {
        paths[normalizedPath] = {};
      }
      const getTitle = (fn2) => {
        if (!fn2.name) return null;
        const wrongNames = ["default"];
        if (wrongNames.includes(fn2.name)) return null;
        if (fn2.name.length <= 3) return null;
        if (fn2.name.includes("_")) return fn2.name.replace(/_/g, " ");
        const name = fn2.name.split(/(?=[A-Z])/).join(" ").toLowerCase();
        return name[0].toUpperCase() + name.slice(1);
      };
      let requestBody;
      if (meta?.body) {
        const schema = zodToSchema(meta.body);
        requestBody = { content: { "application/json": { schema } } };
      }
      let responses;
      if (meta?.response) {
        const schema = zodToSchema(meta.response);
        const description = getReturn(fn);
        responses = {
          200: { description, content: { "application/json": { schema } } }
        };
      }
      const parameters = [];
      const matched = Array.from(path2.matchAll(/:[\w()]+/gi));
      matched.forEach((match) => {
        const [name, type2 = "string"] = match[0].slice(1).replace(/\)/, "").split("(");
        parameters.push({
          name,
          in: "path",
          required: true,
          schema: { type: type2 }
        });
      });
      if (meta?.query) {
        Object.entries(meta.query).map(([key, value]) => ({
          name: key,
          in: "query",
          required: false,
          schema: { type: typeof value },
          example: value
        }));
      }
      paths[normalizedPath][method] = {
        tags: config2.tags,
        summary: config2.title || getTag("@title", fn) || `${method.toUpperCase()} ${normalizedPath}`,
        description: getTitle(fn) || getDescription(fn),
        requestBody,
        parameters,
        responses
      };
    }
  }
  return paths;
};
var openapi_default = async (ctx) => {
  const pkg = await pkgProm;
  const domain = pkg.homepage || ctx.url.origin;
  const openApi = {
    openapi: "3.0.0",
    info: {
      title: pkg.name || "API Documentation",
      version: pkg.version || "1.0.0",
      description: pkg.description || ""
    },
    servers: domain ? [{ url: domain }] : [],
    paths: generateOpenApiPaths(ctx.app.handlers)
  };
  const configuration = ctx.options.openapi?.scalar || {};
  return `
<!doctype html>
<html>
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
    <style>.open-api-client-button {display: none!important;}</style>
  </head>
  <body>
    <script id="api-reference" type="application/json" data-configuration="${encode(JSON.stringify(configuration))}">${JSON.stringify(openApi, null, 2)}</script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html> `;
};

// src/middle/preflight.ts
function preflight(ctx) {
  if (ctx.method !== "options") return;
  if (!ctx.headers["access-control-request-method"]) return;
  const handled = ctx.app.handlers.options.some(
    (route) => pathPattern(route.path, ctx.url.pathname)
  );
  if (handled) return;
  return 204;
}

// src/middle/NoSession.ts
var NoSession = class {
};
function createNoSession() {
  return new Proxy(NoSession, {
    get(target, key) {
      if (target[key]) return target[key];
      if (key === "then") return target[key];
      if (typeof key === "symbol") return target[key];
      throw ServerError_default.NO_STORE_READ({ key: String(key) });
    },
    set(target, key, value) {
      if (target[key] || key === "then" || typeof key === "symbol") {
        target[key] = value;
        return true;
      }
      throw ServerError_default.NO_STORE_WRITE({ key: String(key) });
    }
  });
}

// src/middle/session.ts
async function session(ctx) {
  const store = ctx.options.session?.store;
  if (!store) {
    ctx.session = createNoSession();
    return;
  }
  if (ctx.cookies.session) {
    ctx.session = await store.get(ctx.cookies.session) || {};
  }
}

// src/middle/timer.ts
var createTime = () => {
  const times2 = [["init", performance.now()]];
  const time = (name) => times2.push([name, performance.now()]);
  time.times = times2;
  time.headers = () => {
    const r2 = (t) => Math.round(t);
    const times3 = time.times;
    const timing = times3.slice(1).map(([name, time2], i) => `${name};dur=${r2(time2 - times3[i][1])}`).join(", ");
    return timing;
  };
  return time;
};
function timer(ctx) {
  ctx.time = createTime();
}

// src/auth/socketUser.ts
async function socketUser(app, headers2, cookies2) {
  if (!app.settings.auth) return void 0;
  const ctx = { options: app.settings, headers: headers2, cookies: cookies2 };
  return getUser(ctx);
}

// src/helpers/wsNode.ts
var GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
var CONTINUATION = 0;
var TEXT = 1;
var BINARY = 2;
var CLOSE = 8;
var PING = 9;
var PONG = 10;
function encodeFrame(payload, opcode) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([128 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 128 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 128 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}
var NodeWebSocket = class {
  socket;
  handlers;
  buffer;
  fragments;
  fragmentOpcode;
  closed;
  readyState;
  // The auth user resolved from the upgrade request (see attachWebsocket), or
  // undefined for an anonymous connection. Read by socket handlers as `ctx.user`.
  user;
  constructor(socket, handlers) {
    this.socket = socket;
    this.handlers = handlers;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentOpcode = TEXT;
    this.closed = false;
    this.readyState = 1;
  }
  send(data) {
    if (this.closed) return;
    const isString = typeof data === "string";
    const payload = isString ? Buffer.from(data) : Buffer.from(data);
    this.socket.write(encodeFrame(payload, isString ? TEXT : BINARY));
  }
  close(code = 1e3, reason = "") {
    if (this.closed) return;
    const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
    payload.writeUInt16BE(code, 0);
    payload.write(reason, 2);
    try {
      this.socket.write(encodeFrame(payload, CLOSE));
    } catch {
    }
    this.shutdown();
  }
  // Called once, whether the peer closed, the socket died, or we closed.
  shutdown() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = 3;
    try {
      this.socket.end();
    } catch {
    }
    this.handlers.onClose();
  }
  // Feed raw bytes from the TCP socket; parses as many complete frames as it can
  // and buffers the remainder for the next chunk.
  receive(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    while (true) {
      const buf = this.buffer;
      if (buf.length < 2) return;
      const fin = (buf[0] & 128) !== 0;
      const opcode = buf[0] & 15;
      const masked = (buf[1] & 128) !== 0;
      let len = buf[1] & 127;
      let offset = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }
      let mask = null;
      if (masked) {
        if (buf.length < offset + 4) return;
        mask = buf.subarray(offset, offset + 4);
        offset += 4;
      }
      if (buf.length < offset + len) return;
      const payload = Buffer.from(buf.subarray(offset, offset + len));
      if (mask) {
        for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      }
      this.buffer = buf.subarray(offset + len);
      this.frame(fin, opcode, payload);
    }
  }
  frame(fin, opcode, payload) {
    if (opcode === CLOSE) {
      this.shutdown();
      return;
    }
    if (opcode === PING) {
      if (!this.closed) this.socket.write(encodeFrame(payload, PONG));
      return;
    }
    if (opcode === PONG) return;
    if (opcode === CONTINUATION) {
      this.fragments.push(payload);
    } else {
      this.fragments = [payload];
      this.fragmentOpcode = opcode;
    }
    if (!fin) return;
    const full = this.fragments.length === 1 ? this.fragments[0] : Buffer.concat(this.fragments);
    this.fragments = [];
    const body = this.fragmentOpcode === TEXT ? full.toString("utf8") : full;
    this.handlers.onMessage(body);
  }
};
async function attachWebsocket(server2, app) {
  const { createHash } = await import("crypto");
  server2.on("upgrade", async (req, socket, head) => {
    const key = req.headers["sec-websocket-key"];
    const upgrade = String(req.headers.upgrade || "").toLowerCase();
    if (upgrade !== "websocket" || !key || !app.handlers.socket.length) {
      socket.destroy();
      return;
    }
    const cookies2 = parseCookies(req.headers.cookie);
    let user;
    try {
      user = await socketUser(app, req.headers, cookies2);
    } catch {
      socket.write(
        "HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"
      );
      socket.destroy();
      return;
    }
    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${accept}\r
\r
`
    );
    socket.setTimeout(0);
    socket.setNoDelay(true);
    const ws = new NodeWebSocket(socket, {
      onMessage: (body) => app.websocket.message(ws, body),
      onClose: () => app.websocket.close(ws)
    });
    ws.user = user;
    app.websocket.open(ws);
    if (head?.length) ws.receive(head);
    socket.on("data", (chunk) => ws.receive(chunk));
    socket.on("close", () => ws.shutdown());
    socket.on("error", () => ws.shutdown());
  });
}

// src/context/node.ts
import { TLSSocket } from "tls";

// src/context/isValidMethod.ts
var methods = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "socket"
];
function isValidMethod(method) {
  return methods.includes(method);
}

// src/context/node.ts
var chunkArray = (arr) => arr.length > 2 ? [[arr[0], arr[1]], ...chunkArray(arr.slice(2))] : [arr];
async function createNode(req, app) {
  const init = performance.now();
  const method = req.method?.toLowerCase() || "get";
  if (!isValidMethod(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }
  const chunks = chunkArray(req.rawHeaders);
  const headers2 = parseHeaders_default(new Headers(chunks));
  const cookies2 = parseCookies(headers2.cookie);
  const scheme = req.socket instanceof TLSSocket ? "https" : "http";
  const host = headers2.host || `localhost:${app.settings.port}`;
  const path2 = (req.url || "/").replace(/\/$/, "") || "/";
  const baseUrl = `${scheme}://${host}`;
  const url = new URL(path2, baseUrl);
  define(
    url,
    "query",
    (url2) => Object.fromEntries(url2.searchParams.entries())
  );
  const source = {
    getBuffer: () => new Promise((resolve2, reject) => {
      const chunks2 = [];
      req.on("data", (chunk) => chunks2.push(chunk)).on("end", () => resolve2(Buffer.concat(chunks2))).on("error", reject);
    }),
    getStream: () => toWeb(req)
  };
  const ctx = {
    options: app.settings,
    platform: app.platform,
    url,
    method,
    body: void 0,
    headers: headers2,
    cookies: cookies2,
    session: {},
    init,
    app,
    ip: clientIp(headers2, {
      remoteAddress: req.socket.remoteAddress || "",
      trustProxy: app.settings.security.trustProxy
    })
  };
  setBodySource(ctx, source);
  return ctx;
}

// src/context/winter.ts
async function createWinter(req, app, server2) {
  const init = performance.now();
  const method = req.method.toLowerCase();
  if (!isValidMethod(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }
  const headers2 = parseHeaders_default(req.headers);
  const cookies2 = parseCookies(headers2.cookie);
  const baseUrl = req.url.replace(/\/$/, "") || "/";
  const url = new URL(baseUrl);
  define(
    url,
    "query",
    (url2) => Object.fromEntries(url2.searchParams.entries())
  );
  const source = {
    getBuffer: async () => Buffer.from(await req.arrayBuffer()),
    getStream: () => req.body ?? void 0
  };
  const ctx = {
    options: app.settings,
    platform: app.platform,
    url,
    method,
    body: void 0,
    headers: headers2,
    cookies: cookies2,
    session: {},
    init,
    app,
    ip: clientIp(headers2, {
      remoteAddress: server2?.requestIP?.(req)?.address || "",
      trustProxy: app.settings.security.trustProxy
    })
  };
  setBodySource(ctx, source);
  return ctx;
}

// src/context/handlers.ts
var Winter = async (app, request, env2) => {
  if (env2?.upgrade) {
    const wantsWs = String(request.headers.get("upgrade") || "").toLowerCase() === "websocket";
    if (wantsWs) {
      const headers2 = parseHeaders_default(request.headers);
      const cookies2 = parseCookies(headers2.cookie);
      let user;
      try {
        user = await socketUser(app, headers2, cookies2);
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
      if (env2.upgrade(request, { data: { user } })) return;
    }
  }
  Object.assign(globalThis.env, env2);
  const ctx = await createWinter(request, app, env2);
  const res = await handleRequest(app, ctx);
  return res;
};
var Node = async (app) => {
  const http = await import("http");
  const server2 = http.createServer(
    async (request, response) => {
      const ctx = await createNode(request, app);
      if ("error" in ctx) throw ctx.error;
      const out = await handleRequest(app, ctx);
      response.writeHead(out.status || 200, parseHeaders_default(out.headers));
      try {
        if (out.body instanceof ReadableStream) {
          await iterate(out.body, (chunk) => response.write(chunk));
        } else {
          response.write(out.body || "");
        }
        response.end();
      } catch {
        if (!response.destroyed) response.destroy();
      }
    }
  );
  await attachWebsocket(server2, app);
  server2.listen(app.settings.port, () => {
    app.settings.log.start(`http://localhost:${app.settings.port}/`);
  });
  return server2;
};
var Netlify = async (app, request, context) => {
  request.context = context;
  if (typeof Netlify === "undefined") {
    throw new Error("Netlify doesn't exist");
  }
  const ctx = await createWinter(request, app);
  const res = await handleRequest(app, ctx);
  return res;
};

// src/router.ts
var Router = class _Router {
  // Cross-cutting middleware added with .use(); they run on every request
  middleware = [];
  // Routes per method, each carrying its own (already-flattened) chain of fns
  handlers = {
    socket: [],
    get: [],
    head: [],
    post: [],
    put: [],
    patch: [],
    delete: [],
    options: []
  };
  // For the router we can just return itself since it's not the final export,
  // but then on the root it'll return some fancy wrappers
  self() {
    return this;
  }
  // Registers one route: bakes the current middleware + the route's own
  // functions into a single flat `fns` list. A plain options object may sit
  // between the path and the handlers, and it's pulled out here.
  handle(method, pathOrFn, ...rest) {
    let path2 = "*";
    if (typeof pathOrFn === "string") {
      path2 = pathOrFn;
    } else if (pathOrFn != null) {
      rest.unshift(pathOrFn);
    }
    let options = {};
    if (rest[0] != null && typeof rest[0] !== "function") {
      options = rest.shift();
    }
    const base = method === "socket" ? [] : this.middleware;
    const fns = [...base, ...rest].filter((fn) => fn != null);
    this.handlers[method].push({ path: path2, options, fns });
    return this.self();
  }
  socket(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("socket", pathOrMid, optionsOrMid, ...middleware);
  }
  get(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("get", pathOrMid, optionsOrMid, ...middleware);
  }
  head(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("head", pathOrMid, optionsOrMid, ...middleware);
  }
  post(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("post", pathOrMid, optionsOrMid, ...middleware);
  }
  put(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("put", pathOrMid, optionsOrMid, ...middleware);
  }
  patch(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("patch", pathOrMid, optionsOrMid, ...middleware);
  }
  delete(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("delete", pathOrMid, optionsOrMid, ...middleware);
  }
  options(pathOrMid, optionsOrMid, ...middleware) {
    return this.handle("options", pathOrMid, optionsOrMid, ...middleware);
  }
  use(...args) {
    for (const arg of args) {
      if (arg instanceof _Router) {
        for (const m of Object.keys(arg.handlers)) {
          for (const route of arg.handlers[m]) {
            const base = m === "socket" ? [] : this.middleware;
            this.handlers[m].push({
              path: route.path,
              options: route.options,
              fns: [...base, ...route.fns]
            });
          }
        }
      } else {
        this.middleware.push(arg);
      }
    }
    return this.self();
  }
};
function router() {
  return new Router();
}

// src/ServerTest.ts
function isSerializable(body) {
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
function ServerTest(app) {
  const port = app.settings.port;
  const fetch2 = async (method, path2, options = {}) => {
    if (!options.headers) options.headers = {};
    if (isSerializable(options.body)) {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    return await app.fetch(
      new Request(`http://localhost:${port}${path2}`, {
        method,
        ...options
      })
    );
  };
  return {
    get: (path2, options) => fetch2("get", path2, options),
    head: (path2, options) => fetch2("head", path2, options),
    post: (path2, body, options) => fetch2("post", path2, { body, ...options }),
    put: (path2, body, options) => fetch2("put", path2, { body, ...options }),
    patch: (path2, body, options) => fetch2("patch", path2, { body, ...options }),
    delete: (path2, options) => fetch2("delete", path2, options),
    options: (path2, options) => fetch2("options", path2, options)
  };
}

// src/index.ts
var Server = class extends Router {
  settings;
  platform;
  sockets;
  websocket;
  // Lazily-loaded favicon bytes, cached per server until restart (see favicon
  // middleware). `undefined` = not loaded yet; `null` = configured but missing.
  faviconCache;
  port;
  constructor(options = {}) {
    super();
    this.settings = config(options);
    this.platform = getMachine();
    if (this.settings.port) {
      this.port = this.settings.port;
    }
    this.sockets = [];
    this.websocket = createWebsocket(this.sockets, this.handlers);
    if (this.platform.runtime === "node") {
      this.node();
    } else if (this.platform.runtime === "bun") {
      this.settings.log.start(`http://localhost:${this.settings.port}/`);
    }
    this.use(timer);
    if (this.settings.cors) this.use(preflight);
    this.use(assets);
    if (this.settings.favicon) this.get("/favicon.ico", favicon);
    this.use(session);
    if (this.settings.auth) {
      auth(this);
    }
    if (this.settings.openapi) {
      this.get(this.settings.openapi.path || "/docs", openapi_default);
    }
  }
  self() {
    const cb = this.callback.bind(this);
    const proto = Object.getPrototypeOf(this);
    const keys = Object.keys({ ...this.handlers, ...proto, ...this });
    for (const key of ["use", "node", "fetch", "callback", "test", ...keys]) {
      if (typeof this[key] === "function") {
        cb[key] = this[key].bind(this);
      } else {
        cb[key] = this[key];
      }
    }
    return cb;
  }
  node() {
    return Node(this);
  }
  fetch(request, env2) {
    return Winter(this, request, env2);
  }
  callback(request, context) {
    return Netlify(this, request, context);
  }
  test() {
    return ServerTest(this);
  }
};
function server(options) {
  return new Server(options).self();
}
export {
  Server,
  ServerError_default as ServerError,
  cookies,
  server as default,
  download,
  file,
  headers,
  json,
  redirect,
  router,
  send,
  status,
  type,
  upload
};
