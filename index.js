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
  PATH_TRAVERSAL: {
    status: 400,
    message: "The route param '{param}' tries to climb the path ('{value}'). If this route legitimately receives paths, set security: { traversalProtection: false }"
  },
  AUTH_INVALID_TOKEN: { status: 401, message: "Invalid Authorization token" },
  AUTH_NO_CODE: {
    status: 400,
    message: "Missing the OAuth 'code' in the request body"
  },
  AUTH_INVALID_HEADER: {
    status: 401,
    message: "Invalid authorization header {type}, must send 'Bearer {TOKEN}' (with space)"
  },
  AUTH_INVALID_STATE: { status: 403, message: "Invalid OAuth state" }
});
var errors_default = ServerError_default;

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

// src/helpers/StatusError.ts
var StatusError = class extends Error {
  status;
  constructor(msg, status2 = 500) {
    super(msg);
    this.status = status2;
  }
};

// src/helpers/bucket.ts
import FileSystem from "bucket/fs";
function bucket(root) {
  if (!root) return null;
  if (typeof root === "string") return FileSystem(root);
  if (typeof root.file === "function") return root;
  throw new Error(
    "Invalid bucket: pass a directory path or a `bucket` instance (with .file())"
  );
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

// src/helpers/upload.ts
function resolveUploads(up) {
  if (!up) return null;
  if (typeof up === "object" && "bucket" in up) {
    const { bucket: bucket2, maxSize, minSize, fileType: fileType2 } = up;
    if (maxSize != null) parseBytes(maxSize);
    if (minSize != null) parseBytes(minSize);
    return { bucket: bucket(bucket2), maxSize, minSize, fileType: fileType2 };
  }
  return { bucket: bucket(up) };
}
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
  const ext = getExt(originalName);
  const id = `${createId()}${ext}`;
  const file2 = bucket2.file(id);
  await file2.write(data, { type: contentType });
  return {
    name: originalName,
    path: file2.path,
    type: contentType,
    size: data.length
  };
}
function validateFile(originalName, data, contentType, limits) {
  const { maxSize, minSize, fileType: fileType2 } = limits;
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
  if (fileType2 && fileType2.length > 0) {
    const ext = getExt(originalName);
    const mime = contentType.toLowerCase();
    const allowed = fileType2.some(
      (t) => t.toLowerCase() === mime || t.toLowerCase() === ext
    );
    if (!allowed) {
      throw new Error(
        `File type not allowed for "${originalName}" (got "${contentType}", allowed: ${fileType2.join(", ")})`
      );
    }
  }
}

// src/helpers/bodyLimit.ts
var INF = Number.POSITIVE_INFINITY;
var DEFAULT_MAX = "1mb";
var resolveMax = (max) => max === false ? INF : parseBytes(max == null ? DEFAULT_MAX : max);
var UNITS = ["b", "kb", "mb", "gb", "tb"];
function human(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return `${bytes}`;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1
  );
  const value = bytes / 1024 ** i;
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${UNITS[i]}`;
}
var tooLarge = (max) => new StatusError(
  `Request body exceeds the ${human(max)} limit. Raise it with security: { maxBody: '10mb' }, or maxBody: false to disable it.`,
  413
);

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
  css: "text/css; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gz: "application/gzip",
  gif: "image/gif",
  htm: "text/html; charset=utf-8",
  html: "text/html; charset=utf-8",
  ico: "image/vnd.microsoft.icon",
  ics: "text/calendar; charset=utf-8",
  jar: "application/java-archive",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  jsonld: "application/ld+json",
  md: "text/markdown; charset=utf-8",
  mid: "audio/midi",
  midi: "audio/midi",
  mjs: "text/javascript; charset=utf-8",
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
  text: "text/plain; charset=utf-8",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain; charset=utf-8",
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
for (const ext in mimes_default) extByMime[mimes_default[ext]] = ext;
function extFromType(type2) {
  const base = (type2 || "").split(";")[0].trim().toLowerCase();
  const ext = extByMime[base];
  if (ext) return `.${ext}`;
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
async function toBuffer(input, max = INF) {
  if (!(input instanceof ReadableStream)) {
    if (input.length > max) throw tooLarge(max);
    return input;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of asIterable(input)) {
    total += chunk.byteLength;
    if (total > max) throw tooLarge(max);
    chunks.push(Buffer.from(chunk));
  }
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
function startPart(headerStr, bucket2, limits) {
  const name = getMatching(headerStr, /name="(.+?)"/).trim().replace(/\[\]$/, "");
  if (!name) return { kind: "skip" };
  const filename = getMatching(headerStr, /filename="(.+?)"/).trim();
  if (!filename) return { kind: "text", name, chunks: [] };
  const type2 = getMatching(headerStr, /Content-Type:\s*([^\r\n]+)/i).trim() || "application/octet-stream";
  if (!bucket2) return { kind: "drop" };
  if (limits) {
    return { kind: "validated", name, filename, type: type2, bucket: bucket2, limits, chunks: [] };
  }
  const id = `${createId()}${getExt(filename)}`;
  let controller;
  const readable = new ReadableStream({
    start(c) {
      controller = c;
    }
  });
  const file2 = bucket2.file(id);
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
  if (part.kind === "text" || part.kind === "validated") part.chunks.push(data);
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
  } else if (part.kind === "validated") {
    const buf = Buffer.concat(part.chunks);
    validateFile(part.filename, buf, part.type, part.limits);
    const ref = await saveFileToBucket(part.filename, buf, part.bucket, part.type);
    addField(body, part.name, ref);
  } else if (part.kind === "file") {
    part.controller.close();
    await part.write;
    addField(body, part.name, {
      name: part.filename,
      path: part.file.path,
      type: part.type,
      size: part.size
    });
  }
}
var BREAK = Buffer.from("\r\n\r\n");
async function parseMultipart(stream, boundary, bucket2, limits, max = INF) {
  const delim = Buffer.from(`\r
--${boundary}`);
  const body = {};
  let buf = Buffer.from("\r\n");
  let state = "boundary";
  let part = null;
  let textBytes = 0;
  const feed = (p, data) => {
    if (p.kind === "text") {
      textBytes += data.length;
      if (textBytes > max) throw tooLarge(max);
    }
    feedPart(p, data);
  };
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
        part = startPart(buf.subarray(0, i).toString("utf-8"), bucket2, limits);
        buf = buf.subarray(i + BREAK.length);
        state = "body";
        advanced = true;
      } else {
        const i = buf.indexOf(delim);
        if (i === -1) {
          const safe = buf.length - (delim.length - 1);
          if (safe > 0 && part) {
            feed(part, buf.subarray(0, safe));
            buf = buf.subarray(safe);
          }
          break;
        }
        if (part) {
          feed(part, buf.subarray(0, i));
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
  return { name: id, path: file2.path, type: type2, size };
}
async function parseBody(input, contentType, dest, max = INF) {
  const type2 = Array.isArray(contentType) ? contentType[0] : contentType;
  let bucket2;
  let limits;
  if (dest && "bucket" in dest) {
    bucket2 = dest.bucket;
    const { maxSize, minSize, fileType: fileType2 } = dest;
    if (maxSize != null || minSize != null || fileType2 != null) {
      limits = { maxSize, minSize, fileType: fileType2 };
    }
  } else {
    bucket2 = dest;
  }
  const boundary = type2 && /multipart\/form-data/i.test(type2) ? getBoundary(type2) : null;
  if (boundary) {
    return parseMultipart(toStream(input), boundary, bucket2, limits, max);
  }
  if (!type2 || /^text\//i.test(type2)) {
    const buf = await toBuffer(input, max);
    return buf.length ? buf.toString("utf-8") : void 0;
  }
  if (/application\/json/i.test(type2)) {
    const buf = await toBuffer(input, max);
    return buf.length ? JSON.parse(buf.toString("utf-8")) : void 0;
  }
  if (/application\/x-www-form-urlencoded/i.test(type2)) {
    const buf = await toBuffer(input, max);
    return buf.length ? parseUrlEncoded(buf.toString("utf-8")) : void 0;
  }
  if (!bucket2) {
    const buf = await toBuffer(input, max);
    return buf.length ? buf : void 0;
  }
  if (limits) {
    const buf = await toBuffer(input);
    if (!buf.length) return void 0;
    const name = `upload${extFromType(type2)}`;
    validateFile(name, buf, type2, limits);
    return saveFileToBucket(name, buf, bucket2, type2);
  }
  return streamToBucket(toStream(input), type2, bucket2);
}

// src/helpers/body.ts
var sources = /* @__PURE__ */ new WeakMap();
function setBodySource(ctx, source) {
  sources.set(ctx, source);
}
async function resolveBody(ctx, mode = "parse", max = resolveMax(void 0)) {
  const source = sources.get(ctx);
  if (!source) return void 0;
  const contentType = String(ctx.headers["content-type"] || "");
  const isMultipart = /multipart\/form-data/i.test(contentType);
  const declared = Number(ctx.headers["content-length"]);
  const trustDeclared = !isMultipart && !ctx.options.uploads;
  if (max !== INF && trustDeclared && declared > max) throw tooLarge(max);
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
        controller.enqueue(chunk);
      }
    })
  );
  const parsed = await parseBody(
    counted,
    ctx.headers["content-type"],
    ctx.options.uploads,
    max
  );
  if (size && !ctx.headers["content-length"]) {
    ctx.headers["content-length"] = String(size);
  }
  return parsed;
}

// src/helpers/createCookies.ts
var EXPIRED = (/* @__PURE__ */ new Date(0)).toUTCString();
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
  if (expires === 0) return EXPIRED;
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
  if (val.value === null) val.expires = EXPIRED;
  const { value, path, expires, maxAge, httpOnly, secure, sameSite } = val;
  let str = `${key}=${encodeURIComponent(value ?? "")};Path=${path || "/"}`;
  if (typeof expires !== "undefined") str += `;Expires=${normalizeExpires(expires)}`;
  if (typeof maxAge === "number") str += `;Max-Age=${maxAge}`;
  if (httpOnly) str += ";HttpOnly";
  if (secure) str += ";Secure";
  if (sameSite) str += `;SameSite=${sameSite}`;
  return str;
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

// src/helpers/cache.ts
function resolveCache(value) {
  if (value === false || value === 0) return "no-store";
  if (typeof value === "number") return `public, max-age=${Math.round(value)}`;
  if (typeof value !== "string") return null;
  const ms = parse(value);
  return ms === null ? null : `public, max-age=${Math.round(ms / 1e3)}`;
}
async function applyCache(out, ctx) {
  if (ctx.method !== "get" || out.status !== 200) return out;
  if (!out.headers.has("cache-control")) {
    const value = resolveCache(ctx.options.cache);
    if (value) out.headers.set("cache-control", value);
  }
  if (out.headers.has("etag") || !out.headers.has("content-length")) return out;
  const bytes = new Uint8Array(await out.arrayBuffer());
  const tag = etag(bytes);
  const headers2 = new Headers(out.headers);
  headers2.set("etag", tag);
  if (ctx.headers["if-none-match"] === tag) {
    headers2.delete("content-length");
    return new Response(null, { status: 304, headers: headers2 });
  }
  return new Response(bytes, { status: 200, headers: headers2 });
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

// src/helpers/disposition.ts
var encodeExt = (name) => encodeURIComponent(name).replace(
  /['()*]/g,
  (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
);
function disposition(name) {
  if (!name) return "attachment";
  const clean2 = name.replace(/[\r\n]/g, "").split(/[\\/]/).pop() || "";
  if (!clean2) return "attachment";
  const ascii = clean2.replace(/[^\x20-\x7e]/g, "?");
  const value = `attachment; filename="${ascii.replace(/["\\]/g, "\\$&")}"`;
  if (clean2 === ascii) return value;
  return `${value}; filename*=UTF-8''${encodeExt(clean2)}`;
}

// src/helpers/fileType.ts
function fileType(file2) {
  if (file2.type) return file2.type;
  const name = file2.path || file2.name || "";
  const ext = name.split(".").pop()?.toLowerCase();
  return ext ? mimes_default[ext] : void 0;
}

// src/helpers/isHtml.ts
var TAG = /^\s*<[a-zA-Z!/]/;
function isHtml(body) {
  return TAG.test(body);
}

// src/helpers/isReadableStream.ts
function isReadableStream(obj) {
  return obj !== null && typeof obj === "object" && typeof obj.pipe === "function" && typeof obj.read === "function" && typeof obj.on === "function";
}

// src/reply.ts
var EXPIRED2 = (/* @__PURE__ */ new Date(0)).toUTCString();
var Reply = class _Reply {
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
    const ext = name?.split(".").pop();
    if (ext && !this.res.headers.get("content-type")) this.type(ext);
    return this.headers("content-disposition", disposition(name));
  }
  headers(key, value) {
    if (typeof key !== "string") {
      Object.entries(key).map(([key2, value2]) => this.headers(key2, value2));
      return this;
    }
    if (Array.isArray(value)) {
      this.res.headers.delete(key);
      for (const val of value) this.res.headers.append(key, val);
      return this;
    }
    if (key.toLowerCase() === "set-cookie") {
      this.res.headers.append(key, value);
    } else {
      this.res.headers.set(key, value);
    }
    return this;
  }
  cache(value) {
    const resolved = resolveCache(value);
    if (resolved) this.res.headers.set("cache-control", resolved);
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
    if (value === null) return this.cookies(key, { expires: EXPIRED2 });
    if (typeof value !== "object") return this.cookies(key, { value });
    return this.headers("set-cookie", createCookies(key, value));
  }
  json(body) {
    if (body === void 0) body = null;
    if (!this.res.headers.get("content-type")) {
      this.res.headers.set("content-type", "application/json");
    }
    return this.send(JSON.stringify(body));
  }
  redirect(path) {
    this.headers("location", path);
    if (this.res.status == null) this.res.status = 302;
    return this.send();
  }
  async file(path) {
    if (typeof path !== "string") {
      if (!await path.exists()) return new Response(null, { status: 404 });
      return this.type(fileType(path)).send(path.stream());
    }
    if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)) {
      return new Response(null, { status: 404 });
    }
    try {
      const fs = await import("fs");
      const ext = path.split(".").pop();
      await fs.promises.access(path);
      const stream = fs.createReadStream(path);
      return this.type(ext).send(stream);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        return new Response(null, { status: 404 });
      }
      throw error;
    }
  }
  // Accepts everything a route can return, so `send(x)` and `return x` agree.
  // Async because a bucket file has to be read before its status is known;
  // routes await whatever they return, so this is invisible in normal use.
  async send(input = "") {
    const { status: status2 = 200, headers: headers2 } = this.res;
    let body = input;
    if (status2 === 101 || status2 === 204 || status2 === 205 || status2 === 304) {
      return new Response(null, { status: status2, headers: headers2 });
    }
    if (body === null) body = "";
    if (typeof body?.then === "function") body = await body;
    if (typeof body === "function") body = body();
    if (typeof body?.then === "function") {
      throw new Error(
        "Cannot render an async component: components must be synchronous. Await the data before rendering and pass it in as props."
      );
    }
    if (body instanceof _Reply) body = await body.send();
    if (body instanceof Response) {
      const merged = new Headers(body.headers);
      for (const [key, value] of headers2) {
        if (key === "set-cookie") continue;
        merged.set(key, value);
      }
      for (const cookie of headers2.getSetCookie?.() ?? []) {
        merged.append("set-cookie", cookie);
      }
      if (body.url && /^(br|gzip)$/.test(merged.get("content-encoding") || "")) {
        merged.delete("content-encoding");
      }
      return new Response(body.body, {
        status: this.res.status ?? body.status,
        headers: merged
      });
    }
    if (body && typeof body.stream === "function" && typeof body.bytes === "function" && typeof body.exists === "function" && typeof body.name === "string") {
      return this.file(body);
    }
    if (body instanceof Blob) {
      if (!headers2.get("content-type") && body.type) {
        headers2.set("content-type", body.type);
      }
      return new Response(body, { status: status2, headers: headers2 });
    }
    if (typeof body === "string") {
      if (!headers2.get("content-type")) {
        headers2.set("content-type", isHtml(body) ? mimes_default.html : mimes_default.text);
      }
      if (!headers2.has("content-length")) {
        headers2.set("content-length", String(Buffer.byteLength(body)));
      }
      return new Response(body, { status: status2, headers: headers2 });
    }
    const name = body?.constructor?.name;
    if (body instanceof Uint8Array) {
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
    if (!Array.isArray(body) && body?.[Symbol.iterator]) {
      return new Response(iteratorToReadable(body), { status: status2, headers: headers2 });
    }
    if (body?.[Symbol.asyncIterator]) {
      return new Response(iteratorAsyncToReadable(body), { status: status2, headers: headers2 });
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
var cache = (...args) => r().cache(...args);
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
  const claims2 = {
    iat: now,
    ...expires ? { exp: now + expires } : {},
    ...payload
  };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims2));
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
  let ok = false;
  for (const candidate of Array.isArray(secret) ? secret : [secret]) {
    const key = await hmacKey(candidate);
    ok = await crypto.subtle.verify(
      "HMAC",
      key,
      unb64url(sig),
      enc.encode(`${head}.${body}`)
    );
    if (ok) break;
  }
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

// src/auth/credential.ts
var NAME = "session";
var inCookie = (s) => s === "session" || s === "cookie";
var isSigned = (s) => s === "cookie" || s === "jwt";
function seconds(expires) {
  const ms = parse(expires);
  if (!ms) throw new Error(`Invalid \`expires\`: "${expires}"`);
  return Math.round(ms / 1e3);
}
var looksLikeOurs = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    return header?.alg === "HS256";
  } catch {
    return false;
  }
};
var bearer = (ctx) => {
  const header = ctx.headers.authorization;
  if (!header) return;
  const [type2, token] = header.trim().split(" ");
  if (type2?.toLowerCase() !== "bearer") return;
  if (!token) throw ServerError_default.AUTH_INVALID_HEADER({ type: type2 });
  return token;
};
async function read(ctx, strategy) {
  const token = inCookie(strategy) ? ctx.cookies[NAME] : bearer(ctx);
  if (!token) return;
  const payload = await verifyJwt(token, ctx.options.secrets);
  if (!payload) {
    if (!inCookie(strategy)) throw ServerError_default.AUTH_INVALID_TOKEN();
    ctx.clearCookie = NAME;
    ctx.options.log?.message(
      "auth",
      looksLikeOurs(token) ? "discarded a session cookie signed with a key that is not in SECRETS. If you rotated it, keep the previous value: secrets: [current, previous]" : "discarded a session cookie that was not issued by this app"
    );
    return;
  }
  return payload;
}
var meta = (payload, strategy) => ({
  issuedAt: new Date(payload.iat * 1e3),
  expiresAt: payload.exp ? new Date(payload.exp * 1e3) : void 0,
  strategy,
  provider: payload.provider
});
var issue = (ctx, payload, expires) => signJwt(payload, ctx.options.secrets[0], seconds(expires));

// src/auth/providers/index.ts
import {
  AmazonCognito,
  AniList,
  Apple,
  Atlassian,
  Auth0,
  Authentik,
  Autodesk,
  BattleNet,
  Bitbucket,
  Box,
  Bungie,
  Coinbase,
  Discord,
  DonationAlerts,
  Dribbble,
  Dropbox,
  Etsy,
  EpicGames,
  Facebook,
  Figma,
  Gitea,
  GitHub,
  GitLab,
  Google,
  Intuit,
  Kakao,
  Kick,
  KeyCloak,
  Lichess,
  Line,
  Linear,
  LinkedIn,
  Mastodon,
  MercadoLibre,
  MercadoPago,
  MicrosoftEntraId,
  MyAnimeList,
  Naver,
  Notion,
  Okta,
  Osu,
  Patreon,
  Polar,
  Reddit,
  Roblox,
  Salesforce,
  Shikimori,
  Slack,
  Spotify,
  StartGG,
  Strava,
  TikTok,
  Tiltify,
  Tumblr,
  Twitch,
  Twitter,
  VK,
  Withings,
  WorkOS,
  Yahoo,
  Yandex,
  Zoom,
  FortyTwo
} from "antarctic";

// src/auth/providers/oauth.ts
var credentials = (name, options) => ({
  id: options.id ?? env[`${name.toUpperCase()}_ID`],
  secret: options.secret ?? env[`${name.toUpperCase()}_SECRET`]
});
var passthrough = (options) => {
  const { id, secret, scope, issuer, ...rest } = options;
  return rest;
};
var scopeOf = (options, fallback) => {
  const scope = options.scope ?? fallback;
  return Array.isArray(scope) ? scope.join(" ") : scope;
};
var search = (base, params) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  return `${base}?${query}`;
};

// src/auth/providers/antarctic.ts
var nowhere = {
  get: async () => null,
  set: async () => {
  },
  del: async () => {
  }
};
function antarcticProvider(name, Client) {
  const client = (ctx, options) => {
    const { id, secret } = credentials(name, options);
    if (!id) throw new Error(`${name.toUpperCase()}_ID is not set`);
    return new Client({
      // Whatever that provider needs beyond the standard four: Auth0 takes a
      // `domain`, Keycloak a `realm`, Gitea a `baseURL`, Mastodon an
      // `instance`. Unknown keys go straight through.
      ...passthrough(options),
      clientId: id,
      clientSecret: secret,
      redirectURI: `${ctx.url.origin}/auth/callback/${name}`,
      scopes: options.scope ? Array.isArray(options.scope) ? options.scope : options.scope.split(" ") : void 0,
      store: nowhere
    });
  };
  return {
    async authorize(ctx, options) {
      const { url, state, payload } = await client(
        ctx,
        options
      ).getAuthorizationURL();
      return { url: String(url), state, payload };
    },
    async exchange(ctx, options, code, pending) {
      const user = await client(ctx, options).getUser(
        { code, state: pending.state },
        pending
      );
      return {
        provider: name,
        id: String(user.id),
        email: user.email ?? "",
        name: user.name ?? void 0,
        avatar: user.image ?? void 0,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken ?? void 0,
        raw: user.raw ?? {}
      };
    }
  };
}

// src/auth/providers/index.ts
var CLASSES = {
  amazoncognito: AmazonCognito,
  anilist: AniList,
  apple: Apple,
  atlassian: Atlassian,
  auth0: Auth0,
  authentik: Authentik,
  autodesk: Autodesk,
  battlenet: BattleNet,
  bitbucket: Bitbucket,
  box: Box,
  bungie: Bungie,
  coinbase: Coinbase,
  discord: Discord,
  donationalerts: DonationAlerts,
  dribbble: Dribbble,
  dropbox: Dropbox,
  etsy: Etsy,
  epicgames: EpicGames,
  facebook: Facebook,
  figma: Figma,
  gitea: Gitea,
  github: GitHub,
  gitlab: GitLab,
  google: Google,
  intuit: Intuit,
  kakao: Kakao,
  kick: Kick,
  keycloak: KeyCloak,
  lichess: Lichess,
  line: Line,
  linear: Linear,
  linkedin: LinkedIn,
  mastodon: Mastodon,
  mercadolibre: MercadoLibre,
  mercadopago: MercadoPago,
  microsoftentraid: MicrosoftEntraId,
  myanimelist: MyAnimeList,
  naver: Naver,
  notion: Notion,
  okta: Okta,
  osu: Osu,
  patreon: Patreon,
  polar: Polar,
  reddit: Reddit,
  roblox: Roblox,
  salesforce: Salesforce,
  shikimori: Shikimori,
  slack: Slack,
  spotify: Spotify,
  startgg: StartGG,
  strava: Strava,
  tiktok: TikTok,
  tiltify: Tiltify,
  tumblr: Tumblr,
  twitch: Twitch,
  twitter: Twitter,
  vk: VK,
  withings: Withings,
  workos: WorkOS,
  yahoo: Yahoo,
  yandex: Yandex,
  zoom: Zoom,
  fortytwo: FortyTwo
};
var ALIASES = {
  cognito: "amazoncognito",
  entra: "microsoftentraid",
  microsoft: "microsoftentraid"
};
var providers = Object.fromEntries(
  Object.entries(CLASSES).map(([name, Client]) => [
    name,
    antarcticProvider(name, Client)
  ])
);
for (const [alias, target2] of Object.entries(ALIASES)) {
  providers[alias] = antarcticProvider(alias, CLASSES[target2]);
}
var ISSUERS = {
  paypal: "https://www.paypal.com"
};
var providers_default = providers;

// src/auth/providers/oidc.ts
var discovered = /* @__PURE__ */ new Map();
function discover(issuer) {
  let doc = discovered.get(issuer);
  if (!doc) {
    const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    doc = fetch(url).then((r2) => {
      if (!r2.ok) throw new Error(`Cannot reach the OIDC issuer at ${url}`);
      return r2.json();
    });
    doc.catch(() => discovered.delete(issuer));
    discovered.set(issuer, doc);
  }
  return doc;
}
var claims = (token) => {
  const body = token.split(".")[1];
  if (!body) throw new Error("The issuer returned no usable id_token");
  let b64 = body.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - b64.length % 4) % 4);
  return JSON.parse(atob(b64));
};
function oidcProvider(name) {
  return {
    async authorize(ctx, options) {
      const doc = await discover(options.issuer);
      const state = createId();
      const url = search(doc.authorization_endpoint, {
        client_id: credentials(name, options).id,
        response_type: "code",
        scope: scopeOf(options, "openid email profile"),
        redirect_uri: `${ctx.url.origin}/auth/callback/${name}`,
        state,
        ...passthrough(options)
      });
      return { url, state };
    },
    async exchange(ctx, options, code) {
      const doc = await discover(options.issuer);
      const { id, secret } = credentials(name, options);
      const body = new URLSearchParams({
        client_id: id,
        client_secret: secret,
        code,
        grant_type: "authorization_code"
      });
      body.set("redirect_uri", `${ctx.url.origin}/auth/callback/${name}`);
      const res = await fetch(doc.token_endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded"
        },
        body
      });
      if (!res.ok) throw new Error(`${name}: token exchange failed`);
      const token = await res.json();
      const raw = claims(token.id_token);
      return {
        provider: name,
        id: String(raw.sub),
        email: raw.email,
        name: raw.name,
        avatar: raw.picture,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        raw
      };
    }
  };
}

// src/auth/state.ts
var NAME2 = "oauth_state";
var EXPIRES = "10m";
async function startState(ctx, pending) {
  const value = await signJwt(pending, ctx.options.secrets[0], 10 * 60);
  return {
    value,
    path: "/",
    expires: EXPIRES,
    httpOnly: true,
    secure: ctx.platform.production,
    sameSite: "Lax"
  };
}
async function readState(ctx, received) {
  const cookie = ctx.cookies[NAME2];
  if (!cookie || !received) throw ServerError_default.AUTH_INVALID_STATE();
  const pending = await verifyJwt(cookie, ctx.options.secrets);
  if (!pending || pending.state !== received) {
    throw ServerError_default.AUTH_INVALID_STATE();
  }
  return pending;
}

// src/auth/flow.ts
var SPEC = { schema: { tags: "auth" } };
var wantsJson = (ctx) => String(ctx.headers.accept || "").includes("application/json");
function parseProviders(given) {
  const map2 = typeof given === "string" ? { [given]: {} } : Array.isArray(given) ? Object.fromEntries(given.map((name) => [name, {}])) : { ...given };
  const out = [];
  for (const [name, raw] of Object.entries(map2)) {
    const options = typeof raw === "string" ? { issuer: raw } : { ...raw };
    if (!options.issuer && !providers_default[name] && ISSUERS[name]) {
      options.issuer = ISSUERS[name];
    }
    if (options.issuer) {
      out.push({ name, options, provider: oidcProvider(name) });
    } else if (providers_default[name]) {
      out.push({ name, options, provider: providers_default[name] });
    } else {
      throw new Error(
        `Unknown provider "${name}". Give it an \`issuer\` to use any OIDC provider, or pick one of "${Object.keys(providers_default).join('", "')}".`
      );
    }
  }
  if (!out.length) throw new Error("Auth needs at least one provider");
  return out;
}
var target = async (where, fallback, user, ctx) => typeof where === "function" ? where(user, ctx) : where ?? fallback;
function entry(config2) {
  const list = parseProviders(config2.providers);
  const strategy = config2.strategy ?? "session";
  if (!["session", "cookie", "token", "jwt"].includes(strategy)) {
    throw new Error(
      `Unknown strategy "${strategy}"; it takes 'session', 'cookie', 'token' or 'jwt'.`
    );
  }
  const expires = config2.expires ?? "30d";
  seconds(expires);
  const { onLogin, getUser, toPublicUser, onLogout } = config2;
  if (onLogin && !getUser) {
    throw new Error("`onLogin` needs a `getUser`: something has to resolve the id it returns.");
  }
  if (isSigned(strategy)) {
    if (getUser && !toPublicUser) {
      throw new Error(
        `The \`${strategy}\` strategy signs the user into the credential, so it needs a \`toPublicUser\` to say what goes in. Signing the whole row would publish whatever else is on it.`
      );
    }
  } else if (!getUser) {
    throw new Error(
      `The \`${strategy}\` strategy puts an id in the credential, so it needs a \`getUser\` to resolve it. With no database, use \`cookie\` or \`jwt\`.`
    );
  }
  const publicProfile = ({ id, email, name, avatar }) => ({
    id,
    email,
    name,
    avatar
  });
  const redirects = typeof config2.redirect === "object" ? config2.redirect : {};
  const loginTo = typeof config2.redirect === "object" ? redirects.login : config2.redirect;
  const finish = async (ctx, profile) => {
    const payload = getUser ? await (async () => {
      let id;
      try {
        id = await onLogin(profile, ctx);
      } catch (error) {
        error.expose = true;
        throw error;
      }
      if (id === void 0 || id === null) {
        throw new Error("`onLogin` must return the id the credential points at");
      }
      if (!isSigned(strategy)) return { sub: String(id) };
      const user2 = await getUser(String(id), ctx);
      if (user2 === void 0 || user2 === null) {
        throw new Error(`getUser returned nothing for the id "${id}" that onLogin just returned`);
      }
      return { user: await toPublicUser(user2) };
    })() : { user: publicProfile(profile) };
    const signed = { ...payload, provider: profile.provider };
    const token = await issue(ctx, signed, expires);
    const user = signed.user ?? await getUser(signed.sub, ctx);
    const to = await target(loginTo, "/", user, ctx);
    if (inCookie(strategy)) {
      return cookies("session", {
        value: token,
        path: "/",
        expires,
        httpOnly: true,
        secure: ctx.platform.production,
        sameSite: "Lax"
      }).redirect(to);
    }
    return redirect(`${to}#token=${token}`);
  };
  return {
    name: "flow",
    async user(ctx) {
      const payload = await read(ctx, strategy);
      if (!payload) return;
      ctx.auth = meta(payload, strategy);
      if (payload.user) return payload.user;
      if (!payload.sub) return;
      return getUser(payload.sub, ctx);
    },
    routes(app) {
      for (const { name, options, provider } of list) {
        app.get(`/auth/login/${name}`, SPEC, async (ctx) => {
          const { url, state, payload } = await provider.authorize(ctx, options);
          const cookie = await startState(ctx, { state, payload });
          if (wantsJson(ctx)) {
            return cookies(NAME2, cookie).json({ url });
          }
          return cookies(NAME2, cookie).redirect(url);
        });
        const callback = async (ctx) => {
          const query = ctx.url.query;
          if (query.error) {
            const to = await target(redirects.error, "/", null, ctx);
            return redirect(`${to}?error=${encodeURIComponent(query.error)}`);
          }
          const pending = await readState(ctx, query.state);
          if (!query.code) throw ServerError_default.AUTH_NO_CODE();
          let res;
          try {
            const profile = await provider.exchange(
              ctx,
              options,
              query.code,
              pending
            );
            res = await finish(ctx, profile);
          } catch (error) {
            const to = await target(redirects.error, "/", null, ctx);
            let message = "Could not sign you in";
            if (error?.expose) message = error.message;
            else console.error(`[server:auth] ${name} callback failed:`, error);
            res = await redirect(`${to}?error=${encodeURIComponent(message)}`);
          }
          res.headers.append(
            "set-cookie",
            `${NAME2}=; Path=/; Max-Age=0; HttpOnly`
          );
          return res;
        };
        app.get(`/auth/callback/${name}`, SPEC, callback);
      }
      app.post("/auth/logout", SPEC, async (ctx) => {
        const payload = await read(ctx, strategy).catch(() => void 0);
        if (onLogout && payload?.sub) await onLogout(payload.sub, ctx);
        const to = await target(redirects.logout, "/", null, ctx);
        if (!inCookie(strategy)) return status(204);
        return cookies("session", { value: null }).redirect(to);
      });
    }
  };
}

// src/auth/verify.ts
var enc2 = new TextEncoder();
var dec2 = new TextDecoder();
var unb64url2 = (seg) => {
  let b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - b64.length % 4) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
var ALGS = {
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
  RS384: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
  RS512: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" },
  ES384: { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" }
};
var cache2 = /* @__PURE__ */ new Map();
function keysOf(issuer, refresh = false) {
  let entry3 = cache2.get(issuer);
  if (!entry3 || refresh && Date.now() - entry3.at > 6e4) {
    const keys = (async () => {
      const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const discovery = await fetch(url).then((r2) => r2.json());
      const set = await fetch(discovery.jwks_uri).then((r2) => r2.json());
      const out = /* @__PURE__ */ new Map();
      for (const jwk of set.keys ?? []) {
        const algorithm = ALGS[jwk.alg];
        if (!algorithm) continue;
        out.set(
          jwk.kid,
          await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"])
        );
      }
      return out;
    })();
    keys.catch(() => cache2.delete(issuer));
    entry3 = { at: Date.now(), keys };
    cache2.set(issuer, entry3);
  }
  return entry3.keys;
}
var bearer2 = (ctx) => {
  const header = ctx.headers.authorization;
  if (!header) return;
  const [type2, token] = header.trim().split(" ");
  if (type2?.toLowerCase() !== "bearer") return;
  if (!token) throw ServerError_default.AUTH_INVALID_HEADER({ type: type2 });
  return token;
};
function entry2(options) {
  const { issuer, audience } = options;
  const claimNames = options.audienceClaim ? Array.isArray(options.audienceClaim) ? options.audienceClaim : [options.audienceClaim] : ["aud"];
  if (!audience) {
    throw new Error(
      "`issuer` needs an `audience`: one issuer serves many applications, and without it a token minted for another one is accepted here."
    );
  }
  const allowed = Array.isArray(audience) ? audience : [audience];
  return {
    name: `verify:${issuer}`,
    async user(ctx) {
      const token = options.cookie ? ctx.cookies[options.cookie] : bearer2(ctx);
      if (!token) return;
      let claims2;
      try {
        claims2 = await check(token, issuer, allowed, claimNames);
      } catch (error) {
        if (!options.cookie) throw error;
        ctx.clearCookie = options.cookie;
        ctx.options.log?.message(
          "auth",
          `discarded a ${options.cookie} cookie that ${issuer} did not sign, or that has expired`
        );
        return;
      }
      ctx.auth = {
        issuedAt: new Date((claims2.iat ?? 0) * 1e3),
        expiresAt: claims2.exp ? new Date(claims2.exp * 1e3) : void 0,
        strategy: options.cookie ? "cookie" : "jwt",
        provider: issuer
      };
      if (!options.getUser) return claims2;
      return options.getUser(claims2.sub, ctx);
    }
  };
}
async function check(token, issuer, allowed, claimNames) {
  const parts = token.split(".");
  if (parts.length !== 3) throw ServerError_default.AUTH_INVALID_TOKEN();
  const [head, body, sig] = parts;
  let header;
  let claims2;
  try {
    header = JSON.parse(dec2.decode(unb64url2(head)));
    claims2 = JSON.parse(dec2.decode(unb64url2(body)));
  } catch {
    throw ServerError_default.AUTH_INVALID_TOKEN();
  }
  const algorithm = ALGS[header?.alg];
  if (!algorithm) throw ServerError_default.AUTH_INVALID_TOKEN();
  let key = (await keysOf(issuer)).get(header.kid);
  if (!key) key = (await keysOf(issuer, true)).get(header.kid);
  if (!key) throw ServerError_default.AUTH_INVALID_TOKEN();
  const ok = await crypto.subtle.verify(
    algorithm.name === "ECDSA" ? { name: "ECDSA", hash: algorithm.hash } : algorithm,
    key,
    unb64url2(sig),
    enc2.encode(`${head}.${body}`)
  );
  if (!ok) throw ServerError_default.AUTH_INVALID_TOKEN();
  const now = Math.floor(Date.now() / 1e3);
  if (claims2.exp && now >= claims2.exp) throw ServerError_default.AUTH_INVALID_TOKEN();
  if (claims2.nbf && now < claims2.nbf) throw ServerError_default.AUTH_INVALID_TOKEN();
  if (claims2.iss !== issuer) throw ServerError_default.AUTH_INVALID_TOKEN();
  const name = claimNames.find((one) => claims2[one] !== void 0);
  if (!name) throw ServerError_default.AUTH_INVALID_TOKEN();
  const value = claims2[name];
  const aud = Array.isArray(value) ? value : [value];
  if (!aud.some((one) => allowed.includes(one))) {
    throw ServerError_default.AUTH_INVALID_TOKEN();
  }
  return claims2;
}

// src/auth/vendors.ts
var VENDORS = {
  clerk: {
    cookie: "__session",
    // Clerk session tokens carry no `aud`: the authorized party (your
    // frontend origin) is in `azp`, which is what their own SDK checks
    audience: "your frontend origin, like https://app.example.com",
    claim: "azp",
    docs: "https://clerk.com/docs/backend-requests/resources/session-tokens"
  },
  firebase: {
    // The client SDK holds the token and sends it as a header, so no cookie.
    // Both halves are the project id: the issuer is per-project, and it is
    // what Firebase puts in `aud`.
    audience: "your Firebase project id",
    docs: "https://firebase.google.com/docs/auth/admin/verify-id-tokens"
  },
  // Google Cloud Identity Platform is the same service, and the same tokens,
  // under its enterprise name
  gcip: {
    audience: "your Google Cloud project id",
    docs: "https://cloud.google.com/identity-platform/docs/how-to-verify-tokens"
  },
  supabase: {
    audience: '"authenticated"',
    docs: "https://supabase.com/docs/guides/auth/jwts"
  }
};
var vendors_default = VENDORS;

// src/auth/parse.ts
function parseAuth(auth2) {
  if (!auth2) return null;
  if (Array.isArray(auth2)) {
    throw new Error(
      "`auth` takes one method. For several login options, list them under `providers` instead: auth: { providers: ['github', 'google'], ... }."
    );
  }
  return toEntry(auth2);
}
function vendorEntry(strategy, name) {
  const vendor = vendors_default[name];
  const KEY = name.toUpperCase();
  if (strategy !== "jwt" && strategy !== "cookie") {
    throw new Error(
      `"${strategy}:${name}" is not possible: ${name} issues a signed token, and "${strategy}" means an opaque id resolved through a \`getUser\` of yours. Use "jwt:${name}", or "cookie:${name}" for a same-origin app.`
    );
  }
  if (strategy === "cookie" && !vendor.cookie) {
    throw new Error(
      `"cookie:${name}" is not possible: ${name} does not store its token in a cookie with a fixed name. Use "jwt:${name}", or name the cookie yourself with { verify, audience, cookie }.`
    );
  }
  const issuer = globalThis.env[`${KEY}_ISSUER`];
  if (!issuer) {
    throw new Error(
      `${KEY}_ISSUER is not set, and it differs per account, so it cannot be guessed. See ${vendor.docs}`
    );
  }
  const audience = globalThis.env[`${KEY}_AUDIENCE`];
  if (!audience) {
    throw new Error(
      `${KEY}_AUDIENCE is not set. It should be ${vendor.audience}. One issuer serves many applications, all signed with the same keys, so without it a token minted for another one is accepted here.`
    );
  }
  return entry2({
    issuer,
    audience,
    ...vendor.claim ? { audienceClaim: vendor.claim } : {},
    ...strategy === "cookie" ? { cookie: vendor.cookie } : {}
  });
}
function toEntry(auth2) {
  if (typeof auth2 === "string") {
    const [strategy, name] = auth2.split(":");
    if (!name) {
      throw new Error(
        `Invalid auth "${auth2}": the string form is "<strategy>:<name>", like "cookie:github" to log people in, or "jwt:clerk" to check a token a vendor issued.`
      );
    }
    if (vendors_default[name]) return vendorEntry(strategy, name);
    return entry({ strategy, providers: name });
  }
  if (typeof auth2 === "function") {
    return { name: "function", user: async (ctx) => auth2(ctx) };
  }
  if (auth2 && typeof auth2 === "object") {
    if ("issuer" in auth2) return entry2(auth2);
    if ("providers" in auth2) return entry(auth2);
    if ("handler" in auth2) {
      const instance = auth2;
      const path = (instance.path ?? "/api/auth").replace(/\/$/, "");
      const raw = { parser: "stream" };
      const forward = (ctx) => instance.handler(
        new Request(ctx.url.href, {
          method: ctx.method,
          headers: ctx.headers,
          body: ctx.body,
          // Required by fetch whenever a body is a stream
          ...ctx.body ? { duplex: "half" } : {}
        })
      );
      return {
        name: `instance:${path}`,
        user: async (ctx) => instance.user?.(ctx),
        routes: (app) => {
          const wildcard = `${path}/*`;
          app.get(wildcard, raw, forward);
          app.post(wildcard, raw, forward);
          app.put(wildcard, raw, forward);
          app.patch(wildcard, raw, forward);
          app.delete(wildcard, raw, forward);
        }
      };
    }
  }
  throw new Error(
    "Invalid `auth`: it takes a string, a function, `{ providers }`, `{ issuer, audience }`, a library instance, or an array of those."
  );
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
var UNITS2 = ["b", "kb", "mb", "gb", "tb"];
function formatBytes(bytes) {
  if (!bytes || bytes < 0) return "0b";
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS2.length - 1
  );
  const value = bytes / 1024 ** i;
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${UNITS2[i]}`;
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
    const path = ctx.url.pathname;
    const reqLen = Number(ctx.headers["content-length"]) || 0;
    const resLen = Number(res.headers.get("content-length")) || 0;
    const status2 = res.status;
    const text = STATUS_TEXT[status2] || "";
    const reqSize = reqLen ? ` ${formatBytes(reqLen)}` : "";
    const resSize = resLen ? ` ${formatBytes(resLen)}` : "";
    let line = `${method} ${path}${reqSize} \u2192 ${status2}${text ? ` ${text}` : ""}${resSize}`;
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

// src/helpers/secrets.ts
function resolveSecrets(option) {
  const given = option ?? globalThis.env.SECRETS?.split(",");
  const list = (Array.isArray(given) ? given : [given]).map((one) => one?.trim()).filter(Boolean);
  return list.length ? list : [`unsafe-${createId()}`];
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
    traversalProtection: off ? false : o.traversalProtection !== false,
    // Cap on the bytes buffered per request (see bodyLimit). `false` (or
    // turning security off entirely) resolves to Infinity, meaning no limit.
    maxBody: off ? INF : resolveMax(o.maxBody),
    headers: headers2,
    hsts: off ? null : val(o.hsts, "max-age=15552000; includeSubDomains")
  };
}
var CLIMBS = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
var ABSOLUTE = /^(?:[\\/]|[a-zA-Z]:)/;
function checkTraversal(params, ctx) {
  if (!ctx.options.security?.traversalProtection) return;
  for (const param in params) {
    const value = params[param];
    if (typeof value !== "string") continue;
    if (CLIMBS.test(value) || ABSOLUTE.test(value)) {
      throw errors_default.PATH_TRAVERSAL({ param, value });
    }
  }
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
  const opts = options;
  if (typeof opts.body === "string") {
    throw new Error(
      `The root \`body: '${opts.body}'\` option is now \`parser: '${opts.body}'\`.`
    );
  }
  for (const key of ["body", "query", "params", "response"]) {
    if (opts[key] !== void 0) {
      throw new Error(
        `\`${key}\` is a route option, not a root one; pass it per route, like .post('/', { ${key} }, handler).`
      );
    }
  }
  if (opts.secret !== void 0) {
    throw new Error(
      "The `secret` option is now `secrets`, and takes one key or several: `secrets: [current, previous]` signs with the first and verifies with any, so rotating a key no longer signs everyone out."
    );
  }
  if (env2.SECRET && !env2.SECRETS) {
    throw new Error(
      "The SECRET environment variable is now SECRETS, a comma-separated list. Rename it, or every token signed with the old key breaks."
    );
  }
  const raw = options.log ?? env2.LOG_LEVEL;
  const level = raw === true ? "info" : raw === false ? void 0 : raw;
  const log = createLogger(level);
  const settings = {
    // `env.PORT` is a string, so coerce it: `settings.port` is a number
    port: options.port || Number(env2.PORT) || 3e3,
    secrets: resolveSecrets(options.secrets),
    log,
    // How request bodies are read: parsed into ctx.body by default; `raw` keeps
    // the Buffer, `stream` hands the handler the unread web ReadableStream.
    parser: options.parser ?? "parse",
    // Secure-by-default response headers + trustProxy for ctx.ip. `false` turns
    // the added headers off; see resolveSecurity for the defaults.
    security: resolveSecurity(options.security)
  };
  if (options.cache !== void 0) settings.cache = options.cache;
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
  const publicDir = options.public || env2.PUBLIC;
  settings.public = publicDir ? bucket(publicDir) : null;
  settings.uploads = resolveUploads(options.uploads);
  const production = env2.NODE_ENV === "production";
  if (options.auth || env2.AUTH) {
    settings.auth = parseAuth(
      options.auth || env2.AUTH || null
    );
  }
  if (settings.auth?.name === "flow" && settings.secrets[0].startsWith("unsafe-")) {
    const message = "Auth needs a stable secret: credentials are signed with it, and the random per-process fallback breaks them on restart and across instances. Set the SECRETS environment variable (or the `secrets` option).";
    if (env2.NODE_ENV === "production") throw new Error(message);
    console.warn(`[server:auth] ${message}`);
  }
  if (options.openapi) {
    const o = options.openapi;
    if (o === true) settings.openapi = { path: "/openapi.json" };
    else if (typeof o === "string") settings.openapi = { path: o };
    else settings.openapi = { path: "/openapi.json", ...o };
  }
  settings.onError = options.onError || ((error) => {
    return new Response(error.message || "Server Error", {
      status: error.status || 500
    });
  });
  settings.onResponse = options.onResponse;
  const loc = (v) => typeof v === "string" ? v : "enabled";
  if (settings.auth) log.message("auth", `${settings.auth.name} enabled`);
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (settings.cors) {
    const origin = settings.cors.origin === true ? "*" : String(settings.cors.origin);
    log.message("cors", origin);
  }
  if (settings.cache !== void 0) log.message("cache", loc(options.cache));
  if (settings.openapi) log.message("openapi", settings.openapi.path);
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

// src/helpers/createWebsocket.ts
function createWebsocket(sockets, handlers) {
  const run2 = (event, socket, body) => {
    const routes = handlers.socket?.filter((r2) => r2.path === event) ?? [];
    const user = socket.user ?? socket.data?.user;
    for (const route of routes) {
      for (const fn of route.fns) {
        fn({ socket, sockets, body, user });
      }
    }
  };
  return {
    message: (socket, body) => run2("message", socket, body),
    open: (socket) => {
      sockets.push(socket);
      run2("open", socket);
    },
    close: (socket) => {
      sockets.splice(sockets.indexOf(socket), 1);
      run2("close", socket);
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
    if (!out && typeof out !== "string") return null;
  }
  if (typeof out === "number") {
    out = new Response(null, { status: out });
  }
  if (!(out instanceof Response) || out.url) {
    out = await send(out);
  }
  applyCors(out, ctx);
  applySecurity(out, ctx);
  out = await applyCache(out, ctx);
  if (ctx.clearCookie) {
    out.headers.append(
      "set-cookie",
      `${ctx.clearCookie}=; Path=/; Max-Age=0; HttpOnly`
    );
  }
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }
  return out;
}

// src/pathPattern.ts
function pathPattern(pattern, path) {
  if (pattern === "*" && path === "/") return {};
  pattern = `/${pattern.replace(/^\//, "")}`;
  pattern = pattern.replace(/\/$/, "") || "/";
  path = path.replace(/\/$/, "") || "/";
  if (pattern === path) return {};
  const params = {};
  const pathParts = path.split("/").slice(1).map((u) => decodeURIComponent(u));
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

// src/errors/ValidationError.ts
var ValidationError = class extends StatusError {
  source;
  issues;
  constructor(source, issues) {
    if (source === "response") {
      super("Server Error", 500);
    } else {
      super(`Invalid request ${source}`, 422);
    }
    this.source = source;
    this.issues = issues;
  }
};

// src/helpers/validate.ts
async function run(schema, value, source) {
  const result = await schema["~standard"].validate(value);
  if (result.issues) throw new ValidationError(source, result.issues);
  return result.value;
}
async function validateRequest(ctx, options) {
  if (options.body) {
    ctx.body = await run(options.body, ctx.body ?? {}, "body");
  }
  if (options.query) {
    const query = await run(options.query, ctx.url.query || {}, "query");
    replace2(ctx.url.query, query);
  }
  if (options.params) {
    const params = await run(options.params, ctx.url.params || {}, "params");
    replace2(ctx.url.params, params);
  }
}
async function validateResponse(out, options) {
  if (!options.response) return out;
  if (out?.constructor !== Object && !Array.isArray(out)) return out;
  return await run(options.response, out, "response");
}
function replace2(target2, values) {
  for (const key of Object.keys(target2)) delete target2[key];
  Object.assign(target2, values);
}

// src/helpers/handleRequest.ts
async function handleRequest(app, ctx) {
  let res = await getResponse(app, ctx);
  if (res && ctx.options.onResponse) {
    const replaced = await ctx.options.onResponse(res, ctx);
    if (replaced) res = replaced;
  }
  if (res) ctx.options.log.request(ctx, res);
  if (res?.body && ctx.method === "head") {
    res.body.cancel().catch(() => {
    });
    res = new Response(null, { status: res.status, headers: res.headers });
  }
  return res;
}
async function getResponse(app, ctx) {
  try {
    let matched = false;
    const routes = ctx.method === "head" ? [...app.handlers.head, ...app.handlers.get] : app.handlers[ctx.method];
    for (const route of routes) {
      const params = pathPattern(route.path, ctx.url.pathname || "/");
      if (!params) continue;
      matched = true;
      define(ctx.url, "params", () => params);
      if (Object.keys(route.options).length) {
        ctx.options = { ...app.settings, ...route.options };
      }
      checkTraversal(params, ctx);
      ctx.body = await resolveBody(
        ctx,
        ctx.options.parser,
        ctx.options.security.maxBody
      );
      await validateRequest(ctx, route.options);
      for (const cb of route.fns) {
        const res = await cb(ctx);
        const out = await parseResponse(
          await validateResponse(res, route.options),
          ctx
        );
        if (out) return out;
      }
      break;
    }
    if (!matched) {
      ctx.body = await resolveBody(
        ctx,
        ctx.options.parser,
        ctx.options.security.maxBody
      );
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

// src/helpers/iteratorAsyncToReadable.ts
function iteratorAsyncToReadable(asyncGenerator) {
  let cancelled = false;
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await asyncGenerator.next();
        if (cancelled) return;
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
    // Return the generator so its `finally {}` runs and releases resources.
    async cancel(reason) {
      cancelled = true;
      await asyncGenerator.return?.(reason);
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
      const value = rest.join("=");
      try {
        return [key, decodeURIComponent(value)];
      } catch {
        return [key, value];
      }
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

// src/auth/index.ts
function auth(app) {
  const entry3 = app.settings.auth;
  app.use(async function middle(ctx) {
    ctx.user = await entry3.user(ctx);
  });
  entry3.routes?.(app);
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
  if (ctx.method !== "get" && ctx.method !== "head") return;
  if (ctx.url.pathname === "/") return;
  try {
    const key = ctx.url.pathname.replace(/^\/+/, "");
    const file2 = ctx.options.public.file(key);
    const info = file2.info?.bind(file2);
    const meta2 = info ? await info() : null;
    if (info ? !meta2 : !await file2.exists()) return;
    const ext = ctx.url.pathname.split(".").pop()?.toLowerCase();
    const ctype = ext && mimes_default[ext] || meta2?.type || ext;
    const headers2 = { "cache-control": CACHE_CONTROL };
    let tag;
    if (meta2) {
      const stamp = meta2.modified ? meta2.modified.getTime() : 0;
      tag = `W/"${meta2.size.toString(16)}-${stamp.toString(16)}"`;
      headers2.etag = tag;
      if (meta2.modified) headers2["last-modified"] = meta2.modified.toUTCString();
    }
    const canRange = !!(meta2 && file2.slice);
    if (canRange) headers2["accept-ranges"] = "bytes";
    if (tag && ctx.headers["if-none-match"] === tag) {
      return status(304).headers(headers2).send();
    }
    const rangeHeader = ctx.headers.range;
    const ifRange = ctx.headers["if-range"];
    if (meta2 && file2.slice && rangeHeader && (!ifRange || ifRange === tag)) {
      const range = parseRange(rangeHeader, meta2.size);
      if (range === "unsatisfiable") {
        return status(416).headers({ ...headers2, "content-range": `bytes */${meta2.size}` }).send();
      }
      if (range) {
        const { start, end } = range;
        return type(ctype).status(206).headers({
          ...headers2,
          "content-range": `bytes ${start}-${end}/${meta2.size}`,
          "content-length": String(end - start + 1)
        }).send(file2.slice(start, end + 1).stream());
      }
    }
    return type(ctype).headers(headers2).send(file2.stream());
  } catch {
  }
}

// src/middle/openapi.ts
import * as fsp from "fs/promises";
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
var clean = ({ $schema, ...schema }) => schema;
async function toJsonSchema(schema) {
  try {
    if (typeof schema?.toJsonSchema === "function") {
      return clean(schema.toJsonSchema());
    }
    const vendor = schema?.["~standard"]?.vendor;
    if (vendor === "zod") {
      const mod = await import("zod");
      return clean((mod.toJSONSchema ?? mod.z.toJSONSchema)(schema));
    }
    if (vendor === "valibot") {
      const mod = await import("@valibot/to-json-schema");
      return clean(mod.toJsonSchema(schema));
    }
  } catch {
  }
  return zodToSchema(schema);
}
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
var pkgProm = fsp.readFile("package.json", "utf-8").then((data) => JSON.parse(data)).catch(() => ({}));
var generateOpenApiPaths = async (handlers, specPath) => {
  const paths = {};
  for (const [method, routes] of Object.entries(handlers)) {
    for (const route of routes) {
      const path = route.path;
      const meta2 = route.options ?? {};
      const config2 = getConfig(route.options?.schema);
      if (typeof path !== "string" || path === "*" || path === specPath) {
        continue;
      }
      if (route.options?.schema === false) continue;
      const normalizedPath = path.replace(/\(\w+\)/gi, "").replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      if (!paths[normalizedPath]) {
        paths[normalizedPath] = {};
      }
      let requestBody;
      if (meta2?.body) {
        const schema = await toJsonSchema(meta2.body);
        requestBody = { content: { "application/json": { schema } } };
      }
      let responses;
      if (meta2?.response) {
        const schema = await toJsonSchema(meta2.response);
        responses = {
          200: { description: "OK", content: { "application/json": { schema } } }
        };
      }
      const parameters = [];
      const matched = Array.from(path.matchAll(/:[\w()]+/gi));
      matched.forEach((match) => {
        const [name, type2 = "string"] = match[0].slice(1).replace(/\)/, "").split("(");
        parameters.push({
          name,
          in: "path",
          required: true,
          schema: { type: type2 }
        });
      });
      if (meta2?.query) {
        const schema = await toJsonSchema(meta2.query);
        for (const [name, prop] of Object.entries(schema.properties ?? {})) {
          parameters.push({
            name,
            in: "query",
            required: schema.required?.includes(name) ?? false,
            schema: prop
          });
        }
      }
      paths[normalizedPath][method] = {
        tags: config2.tags,
        summary: config2.title,
        description: config2.description,
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
  const { title, description, version } = ctx.options.openapi ?? {};
  const domain = pkg.homepage || ctx.url.origin;
  return {
    openapi: "3.0.0",
    info: {
      title: title || pkg.name || "API Documentation",
      version: version || pkg.version || "1.0.0",
      description: description ?? (pkg.description || "")
    },
    servers: domain ? [{ url: domain }] : [],
    paths: await generateOpenApiPaths(
      ctx.app.handlers,
      ctx.options.openapi?.path ?? ""
    )
  };
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
  return app.settings.auth.user(ctx);
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
async function createNode(req, app, signal = new AbortController().signal) {
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
  const path = (req.url || "/").replace(/\/$/, "") || "/";
  const baseUrl = `${scheme}://${host}`;
  const url = new URL(path, baseUrl);
  define(
    url,
    "query",
    (url2) => Object.fromEntries(url2.searchParams.entries())
  );
  const source = {
    getBuffer: () => new Promise((resolve, reject) => {
      const chunks2 = [];
      req.on("data", (chunk) => chunks2.push(chunk)).on("end", () => resolve(Buffer.concat(chunks2))).on("error", reject);
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
    signal,
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
    signal: req.signal,
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
      const controller = new AbortController();
      response.on("close", () => {
        if (!response.writableFinished) controller.abort();
      });
      const ctx = await createNode(request, app, controller.signal);
      if ("error" in ctx) throw ctx.error;
      const out = await handleRequest(app, ctx);
      response.writeHead(out.status || 200, parseHeaders_default(out.headers));
      try {
        if (out.body instanceof ReadableStream) {
          const reader = out.body.getReader();
          response.on("close", () => reader.cancel().catch(() => {
          }));
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            response.write(value);
          }
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
function checkParserConflict(options, globalParser) {
  const parser = options.parser ?? globalParser ?? "parse";
  if (options.body && parser !== "parse") {
    throw new Error(
      `A \`parser: '${parser}'\` route never parses the body, so its \`body\` schema cannot run. Remove one, or set \`parser: 'parse'\` on the route.`
    );
  }
}
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
    let path = "*";
    if (typeof pathOrFn === "string") {
      path = pathOrFn;
    } else if (pathOrFn != null) {
      rest.unshift(pathOrFn);
    }
    let options = {};
    if (rest[0] != null && typeof rest[0] !== "function") {
      options = rest.shift();
    }
    checkParserConflict(options, this.settings?.parser);
    if (options.uploads !== void 0) {
      options.uploads = resolveUploads(options.uploads);
    }
    const base = method === "socket" ? [] : this.middleware;
    const fns = [...base, ...rest].filter((fn) => fn != null);
    this.handlers[method].push({ path, options, fns });
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
            checkParserConflict(route.options, this.settings?.parser);
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
  const fetch2 = async (method, path, options = {}) => {
    if (!options.headers) options.headers = {};
    if (isSerializable(options.body)) {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) && !/^https?:\/\//i.test(path)) {
      throw new Error(
        `Only http(s) URLs can be tested, received "${path}". Pass a path, or the full URL of the host the request should hit.`
      );
    }
    const url = /^https?:\/\//i.test(path) ? path : `http://localhost:${port}${path}`;
    return await app.fetch(
      new Request(url, {
        method,
        ...options
      })
    );
  };
  return {
    get: (path, options) => fetch2("get", path, options),
    head: (path, options) => fetch2("head", path, options),
    post: (path, body, options) => fetch2("post", path, { body, ...options }),
    put: (path, body, options) => fetch2("put", path, { body, ...options }),
    patch: (path, body, options) => fetch2("patch", path, { body, ...options }),
    delete: (path, options) => fetch2("delete", path, options),
    options: (path, options) => fetch2("options", path, options)
  };
}

// src/index.ts
import { default as default2 } from "bucket";
var Server = class extends Router {
  settings;
  platform;
  sockets;
  websocket;
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
    const app = this;
    app.use(timer);
    if (this.settings.cors) app.use(preflight);
    app.use(assets);
    if (this.settings.auth) {
      auth(app);
    }
    if (this.settings.openapi) {
      app.get(this.settings.openapi.path, openapi_default);
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
  ValidationError,
  default2 as bucket,
  cache,
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
  type
};
