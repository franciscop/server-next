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
  AUTH_ARGON_NEEDED: "Argon2 is needed for the auth module, please install it with 'npm i argon2'",
  AUTH_INVALID_TOKEN: { status: 401, message: "Invalid Authorization token" },
  AUTH_NO_CODE: {
    status: 400,
    message: "Missing the OAuth 'code' in the request body"
  },
  SESSION_JWT: "The `jwt` strategy is stateless, so there is no `ctx.session` (tried '{key}'). Use the `token` strategy for server-side sessions, or `cookie` for browsers",
  SESSION_GUEST: "No `ctx.session` for this request (tried '{key}'): the `token` strategy carries the session in the Authorization header, and this request has none. Sign in first, or use the `cookie` strategy for guest sessions",
  AUTH_INVALID_HEADER: {
    status: 401,
    message: "Invalid authorization header {type}, must send 'Bearer {TOKEN}' (with space)"
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
  AUTH_INVALID_USER: {
    status: 500,
    message: "{callback} must return a user with an 'id' and an 'email'"
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

// src/helpers/store.ts
import kv from "polystore";
function isStore(source) {
  const store = source;
  return Boolean(
    store && typeof store.prefix === "function" && typeof store.get === "function" && typeof store.set === "function"
  );
}
function toStore(source) {
  if (isStore(source)) return source;
  return kv(source);
}
function toStoreExpiring(source, expires) {
  if (isStore(source)) return source;
  return kv(source).expires(expires);
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
      if (!await path.exists()) return this.status(404).send();
      return this.type(fileType(path)).send(path.stream());
    }
    if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path)) return this.status(404).send();
    try {
      const fs = await import("fs");
      const ext = path.split(".").pop();
      await fs.promises.access(path);
      const stream = fs.createReadStream(path);
      return this.type(ext).send(stream);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
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
    if (body === null) body = "";
    if (typeof body === "function") body = body();
    if (typeof body?.then === "function") {
      throw new Error(
        "send() received a promise, likely an async component. Await it first, or return it from the route, which resolves it for you."
      );
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

// src/auth/assertUser.ts
function assertUser(user, callback3) {
  if (!user || typeof user !== "object" || user.id == null || !user.email) {
    throw ServerError_default.AUTH_INVALID_USER({ callback: callback3 });
  }
}

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
function findSessionId(ctx) {
  if (ctx.options.auth?.strategy.includes("token")) {
    if (!ctx.headers.authorization) return;
    return validateToken(ctx.headers.authorization);
  }
  return ctx.cookies.session || void 0;
}

// src/middle/session.ts
var loaded = /* @__PURE__ */ new WeakMap();
function noSession(error) {
  const target = {};
  return new Proxy(target, {
    get(target2, key) {
      if (typeof key === "symbol" || key === "then") return target2[key];
      throw error(String(key));
    },
    set(target2, key, value) {
      if (typeof key === "symbol") {
        target2[key] = value;
        return true;
      }
      throw error(String(key));
    }
  });
}
async function session(ctx) {
  const strategy = ctx.options.auth?.strategy;
  if (strategy?.includes("jwt")) {
    ctx.session = noSession((key) => ServerError_default.SESSION_JWT({ key }));
    return;
  }
  const id = findSessionId(ctx);
  if (!id && strategy?.includes("token")) {
    ctx.session = noSession((key) => ServerError_default.SESSION_GUEST({ key }));
    return;
  }
  ctx.session = id && await ctx.options.sessions.get(id) || {};
  loaded.set(ctx, { id, data: JSON.stringify(ctx.session) });
}

// src/auth/finishLogin.ts
async function finishLogin(ctx, input, opts = {}) {
  const settings = ctx.options.auth;
  const { strategy, onLogin, onUser, onToken } = settings;
  const key = String(input.key);
  if (!strategy.includes("jwt") && !loaded.has(ctx)) {
    ctx.session = {};
    loaded.set(ctx, { id: void 0, data: "{}" });
  }
  const auth2 = {
    user: key,
    provider: input.provider,
    created: (/* @__PURE__ */ new Date()).toISOString().replace(/\.[0-9]*/, "")
  };
  const loginUser = {
    ...input.user,
    provider: input.provider,
    strategy
  };
  const existingUser = await settings.users.get(key) ?? null;
  const user = onLogin ? await onLogin(loginUser, existingUser, ctx) : { ...existingUser ?? {}, ...loginUser };
  assertUser(user, "onLogin");
  await settings.users.set(key, user);
  if (strategy.includes("jwt")) {
    const payload = {
      ...await onToken(user, ctx),
      provider: input.provider
    };
    assertUser(payload, "onToken");
    const token = await signJwt(payload, ctx.options.secret, 7 * 24 * 60 * 60);
    const exposed = await onUser(payload, ctx);
    assertUser(exposed, "onUser");
    return status(201).json({ ...exposed, token });
  }
  const prev = loaded.get(ctx);
  if (prev?.id) await ctx.options.sessions.del(prev.id);
  const id = createId();
  Object.assign(ctx.session, auth2);
  await ctx.options.sessions.set(id, ctx.session);
  loaded.set(ctx, { id, data: JSON.stringify(ctx.session) });
  if (strategy.includes("token")) {
    const exposed = await onUser(user, ctx);
    assertUser(exposed, "onUser");
    return status(201).json({ ...exposed, token: id });
  }
  if (strategy.includes("cookie")) {
    const reply = cookies("session", {
      value: id,
      path: "/",
      httpOnly: true,
      secure: ctx.platform.production,
      sameSite: "Lax"
    });
    if (opts.json) {
      const exposed = await onUser(user, ctx);
      assertUser(exposed, "onUser");
      return reply.status(201).json(exposed);
    }
    return reply.redirect(settings.redirect);
  }
  throw new Error("Unknown auth type");
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
var exchange = async (code, redirectUri, user) => {
  const params = new URLSearchParams({
    client_id: env.APPLE_ID,
    client_secret: await clientSecret(),
    code: code ?? "",
    grant_type: "authorization_code"
  });
  if (redirectUri) params.set("redirect_uri", redirectUri);
  const tokenRes = await fetch(TOKEN, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  if (!tokenRes.ok) throw new Error("apple: token exchange failed");
  const token = await tokenRes.json();
  const claims = b64urlJson(token.id_token.split(".")[1]);
  let name;
  if (user) {
    const parsed = JSON.parse(user).name;
    if (parsed) name = `${parsed.firstName} ${parsed.lastName}`.trim();
  }
  return { ...claims, name };
};
var finish = async (ctx, raw, opts) => {
  const { onProfile } = ctx.options.auth;
  const profile = onProfile ? await onProfile(raw, "apple") : { id: raw.sub, name: raw.name, email: raw.email };
  assertUser(profile, "onProfile");
  return finishLogin(
    ctx,
    {
      provider: "apple",
      key: profile.id,
      email: profile.email,
      user: profile
    },
    opts
  );
};
var callback = async (ctx) => {
  const body = ctx.body || {};
  checkState(ctx, body.state);
  const url = `${ctx.url.origin}/auth/callback/apple`;
  const raw = await exchange(body.code, url, body.user);
  const res = await finish(ctx, raw);
  res.headers.append("set-cookie", clearState());
  return res;
};
var verify = async (ctx) => {
  const { code, redirect_uri, user } = ctx.body ?? {};
  if (!code) throw ServerError_default.AUTH_NO_CODE();
  const raw = await exchange(code, redirect_uri, user);
  return finish(ctx, raw, { json: true });
};
var apple_default = { login, callback, verify };

// src/auth/providers/oauth.ts
var wantsJson = (ctx) => String(ctx.headers.accept || "").includes("application/json");
var clientParams = (source) => ({
  redirect_uri: source.redirect_uri,
  state: source.state,
  code_challenge: source.code_challenge,
  code_challenge_method: source.code_challenge ? "S256" : void 0
});
function oauthProvider(config2) {
  const KEY = config2.name.toUpperCase();
  const callbackUrl = (ctx) => `${ctx.url.origin}/auth/callback/${config2.name}`;
  const authorizeUrl2 = (params) => {
    const search = new URLSearchParams({
      client_id: env[`${KEY}_ID`],
      response_type: "code",
      scope: config2.scope
    });
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    return `${config2.authorizeUrl}?${search}`;
  };
  const login3 = (ctx) => {
    if (wantsJson(ctx)) {
      return json({ url: authorizeUrl2(clientParams(ctx.url.query)) });
    }
    const { state, cookie } = startState(ctx);
    const url = authorizeUrl2({ redirect_uri: callbackUrl(ctx), state });
    return cookies("oauth_state", cookie).redirect(url);
  };
  const exchange2 = async (ctx, code, extra) => {
    const body = new URLSearchParams({
      client_id: env[`${KEY}_ID`],
      client_secret: env[`${KEY}_SECRET`],
      code,
      grant_type: "authorization_code"
    });
    for (const [key, value] of Object.entries(extra)) {
      if (value) body.set(key, value);
    }
    const tokenRes = await fetch(config2.tokenUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded"
      },
      body
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
    return profileRes.json();
  };
  const finish3 = async (ctx, raw, opts) => {
    const { onProfile } = ctx.options.auth;
    const profile = onProfile ? await onProfile(raw, config2.name) : config2.profile(raw);
    assertUser(profile, "onProfile");
    return finishLogin(
      ctx,
      {
        provider: config2.name,
        key: profile.id,
        email: profile.email,
        user: profile
      },
      opts
    );
  };
  const callback3 = async (ctx) => {
    checkState(ctx, ctx.url.query.state);
    const raw = await exchange2(ctx, ctx.url.query.code, {
      redirect_uri: callbackUrl(ctx)
    });
    const res = await finish3(ctx, raw);
    res.headers.append("set-cookie", clearState());
    return res;
  };
  const verify4 = async (ctx) => {
    const { code, redirect_uri, code_verifier } = ctx.body ?? {};
    if (!code) throw ServerError_default.AUTH_NO_CODE();
    const raw = await exchange2(ctx, code, { redirect_uri, code_verifier });
    return finish3(ctx, raw, { json: true });
  };
  return { login: login3, callback: callback3, verify: verify4 };
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
  const users = ctx.options.auth.users;
  if (!await users.has(email)) throw ServerError_default.LOGIN_WRONG_EMAIL();
  const user = await users.get(email);
  const isValid = await verify2(password, user.password);
  if (!isValid) throw ServerError_default.LOGIN_WRONG_PASSWORD();
  return finishLogin(ctx, {
    provider: "email",
    key: user.email,
    email: user.email,
    user
  });
}
async function emailRegister(ctx) {
  const { email, password, ...data } = ctx.body;
  if (!email) throw ServerError_default.REGISTER_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError_default.REGISTER_INVALID_EMAIL();
  if (!password) throw ServerError_default.REGISTER_NO_PASSWORD();
  if (password.length < 8) throw ServerError_default.REGISTER_INVALID_PASSWORD();
  const users = ctx.options.auth.users;
  if (await users.has(email)) throw ServerError_default.REGISTER_EMAIL_EXISTS();
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
  return finishLogin(ctx, {
    provider: "email",
    key: email,
    email,
    user
  });
}
async function emailResetPassword() {
}
async function emailUpdatePassword(ctx) {
  const passwords = ctx.body;
  const fullUser = await ctx.options.auth.users.get(ctx.user.email);
  if (!fullUser) throw ServerError_default.AUTH_NO_USER();
  const isValid = await verify2(passwords.previous, fullUser.password);
  if (!isValid) throw ServerError_default.LOGIN_WRONG_PASSWORD();
  fullUser.password = await hash2(passwords.updated);
  await updateUser(fullUser, ctx.user, ctx.options.auth.users);
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
var AUTHORIZE2 = "https://github.com/login/oauth/authorize";
var oauth = async (code, extra) => {
  const fch = async (url, { body, headers: headers2 = {}, ...rest } = {}) => {
    headers2.accept = "application/json";
    headers2["content-type"] = "application/json";
    const res2 = await fetch(url, { ...rest, body, headers: headers2 });
    if (!res2.ok) throw new Error("Invalid request");
    return res2.json();
  };
  const params = {
    client_id: env.GITHUB_ID,
    client_secret: env.GITHUB_SECRET,
    code
  };
  for (const [key, value] of Object.entries(extra)) {
    if (value) params[key] = value;
  }
  const res = await fch("https://github.com/login/oauth/access_token", {
    method: "post",
    body: JSON.stringify(params)
  });
  return (path) => {
    return fch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${res.access_token}` }
    });
  };
};
var authorizeUrl = (params) => {
  const search = new URLSearchParams({
    client_id: env.GITHUB_ID,
    scope: "user:email"
  });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${AUTHORIZE2}?${search}`;
};
var login2 = (ctx) => {
  if (wantsJson(ctx)) {
    return json({ url: authorizeUrl(clientParams(ctx.url.query)) });
  }
  const { state, cookie } = startState(ctx);
  return cookies("oauth_state", cookie).redirect(authorizeUrl({ state }));
};
var getUserProfile = async (code, extra = {}) => {
  const api = await oauth(code, extra);
  const [profile, emails] = await Promise.all([
    api("/user"),
    api("/user/emails")
  ]);
  const email = emails.sort((a) => a.primary ? -1 : 1)[0]?.email;
  return { ...profile, email };
};
var defaultProfile = (raw) => ({
  id: raw.id,
  name: raw.name,
  email: raw.email,
  picture: raw.avatar_url,
  location: raw.location,
  created: raw.created_at
});
var finish2 = async (ctx, raw, opts) => {
  const { onProfile } = ctx.options.auth;
  const profile = onProfile ? await onProfile(raw, "github") : defaultProfile(raw);
  assertUser(profile, "onProfile");
  return finishLogin(
    ctx,
    {
      provider: "github",
      key: profile.id,
      email: profile.email,
      user: profile
    },
    opts
  );
};
var callback2 = async (ctx) => {
  checkState(ctx, ctx.url.query.state);
  const raw = await getUserProfile(ctx.url.query.code);
  const res = await finish2(ctx, raw);
  res.headers.append("set-cookie", clearState());
  return res;
};
var verify3 = async (ctx) => {
  const { code, redirect_uri, code_verifier } = ctx.body ?? {};
  if (!code) throw ServerError_default.AUTH_NO_CODE();
  const raw = await getUserProfile(code, { redirect_uri, code_verifier });
  return finish2(ctx, raw, { json: true });
};
var github_default = { login: login2, callback: callback2, verify: verify3 };

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
function defaultOnUser(fullUser) {
  const { password: _password, ...user } = fullUser;
  return user;
}
var available = Object.keys(providers_default);
function parseAuthOptions(auth2) {
  if (!auth2) return null;
  if (typeof auth2 === "string") {
    const [strategy2, provider] = auth2.split(":");
    auth2 = { strategy: strategy2, providers: provider ? [provider] : [] };
  }
  if (!auth2.strategy?.length) {
    throw new Error("Auth options needs a strategy");
  }
  const strategy = auth2.strategy;
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
  const { onProfile, onLogin, onLogout } = auth2;
  const onUser = auth2.onUser || defaultOnUser;
  const onToken = auth2.onToken || defaultOnUser;
  const users = auth2.users ? toStore(auth2.users) : null;
  return {
    strategy,
    providers: list,
    redirect: redirect2,
    onProfile,
    onLogin,
    onUser,
    onToken,
    onLogout,
    users
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
  const raw = options.log ?? env2.LOG_LEVEL;
  const level = raw === true ? "info" : raw === false ? void 0 : raw;
  const log = createLogger(level);
  const settings = {
    port: options.port || env2.PORT || 3e3,
    secret: options.secret || env2.SECRET || `unsafe-${createId()}`,
    log,
    // How request bodies are read: parsed into ctx.body by default; `raw` keeps
    // the Buffer, `stream` hands the handler the unread web ReadableStream.
    parser: options.parser ?? "parse",
    // Secure-by-default response headers + trustProxy for ctx.ip. `false` turns
    // the added headers off; see resolveSecurity for the defaults.
    security: resolveSecurity(options.security),
    // Sessions: one record per device, exposed as ctx.session. Anything
    // polystore accepts works; raw sources (a Map, a Redis client) get a 1w
    // expiry, a built store is honored as-is, prefix and expiry included.
    sessions: toStoreExpiring(options.sessions ?? /* @__PURE__ */ new Map(), "1w")
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
  const defaulted = options.sessions == null;
  settings.sessionsDefault = defaulted;
  if (options.auth || env2.AUTH) {
    settings.auth = parseAuthOptions(options.auth || env2.AUTH || null);
  }
  if (settings.auth) {
    if (!settings.auth.users) {
      if (production) {
        throw new Error(
          "Auth in production needs a persistent `users` store, like auth: { ..., users: kv(redis).prefix('user:') }."
        );
      }
      settings.auth.users = toStore(/* @__PURE__ */ new Map());
    }
    if (production && defaulted && !settings.auth.strategy.includes("jwt")) {
      throw new Error(
        "Auth in production needs a persistent `sessions` store, like sessions: kv(redis).prefix('session:')."
      );
    }
  }
  if (settings.auth?.strategy.includes("jwt") && settings.secret.startsWith("unsafe-")) {
    console.warn(
      "[server:auth] jwt strategy with no SECRET set: tokens are signed with a random per-process secret, so they break on restart and across instances. Set the SECRET environment variable (or the `secret` option)."
    );
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
  if (settings.auth) {
    log.message("auth", `${settings.auth.providers.join(", ")} auth enabled`);
  }
  if (settings.public) log.message("public", loc(options.public));
  if (settings.uploads) log.message("uploads", loc(options.uploads));
  if (options.sessions) log.message("sessions", "enabled");
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
var warned = false;
var warnDefault = () => {
  if (warned) return;
  warned = true;
  console.warn(
    "[server:sessions] Using the default in-memory session store in production: sessions are lost on restart and not shared across instances. Configure one with sessions: kv(redis).prefix('session:')."
  );
};
async function parseResponse(out, ctx) {
  if (!out && typeof out !== "string") return null;
  if (typeof out === "function") {
    out = await out(ctx);
  }
  if (out && typeof out.send === "function" && out.res?.headers instanceof Headers) {
    out = out.send();
  }
  if (out instanceof Blob) {
    out = new Response(out, { headers: { "Content-Type": out.type } });
  }
  if (out && typeof out.stream === "function" && typeof out.bytes === "function" && typeof out.exists === "function" && typeof out.name === "string") {
    if (!await out.exists()) {
      out = new Response(null, { status: 404 });
    } else {
      const type2 = fileType(out);
      out = new Response(
        out.stream(),
        type2 ? { headers: { "content-type": type2 } } : void 0
      );
    }
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
    const type2 = isHtml(out) ? mimes_default.html : mimes_default.text;
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
  out = await applyCache(out, ctx);
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }
  const prev = loaded.get(ctx);
  if (prev && JSON.stringify(ctx.session ?? {}) !== prev.data) {
    if (ctx.options.sessionsDefault && ctx.platform.production) {
      warnDefault();
    }
    let id = prev.id;
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
    ctx.options.sessions.set(id, ctx.session);
  }
  if (ctx?.res?.headers) {
    for (const key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
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
function replace2(target, values) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, values);
}

// src/helpers/handleRequest.ts
async function handleRequest(app, ctx) {
  let res = await getResponse(app, ctx);
  if (res && ctx.options.onResponse) {
    const replaced = await ctx.options.onResponse(res, ctx);
    if (replaced) res = replaced;
  }
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
async function verify2(password, hash3) {
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
  return new Promise((resolve, reject) => {
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
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );
  });
}

// src/auth/getUser.ts
async function getJwtUser(ctx) {
  const header = ctx.headers.authorization;
  if (!header) return;
  const [type2, token] = header.trim().split(" ");
  if (type2?.toLowerCase() !== "bearer" || !token) {
    throw ServerError_default.AUTH_INVALID_HEADER({ type: type2 });
  }
  const payload = await verifyJwt(token, ctx.options.secret);
  if (!payload) throw ServerError_default.AUTH_INVALID_TOKEN();
  const { iat, exp, ...claims } = payload;
  if (!claims.id || !claims.email) throw ServerError_default.AUTH_INVALID_TOKEN();
  if (!ctx.options.auth.providers.includes(claims.provider)) {
    throw ServerError_default.AUTH_INVALID_PROVIDER({
      provider: claims.provider,
      valid: ctx.options.auth.providers
    });
  }
  const exposed = await ctx.options.auth.onUser(claims, ctx);
  assertUser(exposed, "onUser");
  return exposed;
}
async function getAuthSession(ctx) {
  if (loaded.has(ctx)) {
    const session3 = ctx.session;
    return session3?.user ? session3 : void 0;
  }
  const id = findSessionId(ctx);
  if (!id) return;
  const session2 = await ctx.options.sessions.get(id);
  return session2?.user ? session2 : void 0;
}
async function getUser(ctx) {
  if (!ctx.options.auth) return;
  const options = ctx.options.auth;
  if (options.strategy.includes("jwt")) return getJwtUser(ctx);
  const auth2 = await getAuthSession(ctx);
  if (!auth2) return;
  if (!options.providers.includes(auth2.provider)) {
    throw ServerError_default.AUTH_INVALID_PROVIDER({
      provider: auth2.provider,
      valid: options.providers
    });
  }
  const user = await options.users.get(auth2.user);
  if (!user) throw ServerError_default.AUTH_NO_USER();
  const exposed = await options.onUser(user, ctx);
  assertUser(exposed, "onUser");
  return exposed;
}

// src/auth/logout.ts
async function logout(ctx) {
  const { strategy } = ctx.options.auth;
  if (!strategy.includes("jwt")) {
    const prev = loaded.get(ctx);
    if (prev?.id) await ctx.options.sessions.del(prev.id);
    ctx.session = {};
    loaded.set(ctx, { id: void 0, data: "{}" });
  }
  if (ctx.options.auth.onLogout) await ctx.options.auth.onLogout(ctx);
  if (strategy.includes("token") || strategy.includes("jwt")) {
    return { token: null };
  }
  if (strategy.includes("cookie")) {
    return cookies({ session: null }).redirect("/");
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
  app.post("/auth/logout", logout);
  const enabled = app.settings.auth.providers;
  for (const name of oauth2) {
    if (!enabled.includes(name)) continue;
    const key = name.toUpperCase();
    if (!env[`${key}_ID`]) throw new Error(`${key}_ID not defined`);
    if (!env[`${key}_SECRET`]) throw new Error(`${key}_SECRET not defined`);
    app.get(`/auth/login/${name}`, providers_default[name].login);
    app.get(`/auth/callback/${name}`, providers_default[name].callback);
    app.post(`/auth/verify/${name}`, providers_default[name].verify);
  }
  if (enabled.includes("apple")) {
    const keys = ["APPLE_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"];
    for (const key of keys) {
      if (!env[key]) throw new Error(`${key} not defined`);
    }
    app.get("/auth/login/apple", providers_default.apple.login);
    app.post("/auth/callback/apple", providers_default.apple.callback);
    app.post("/auth/verify/apple", providers_default.apple.verify);
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
    const info = file2.info?.bind(file2);
    const meta = info ? await info() : null;
    if (info ? !meta : !await file2.exists()) return;
    const ext = ctx.url.pathname.split(".").pop()?.toLowerCase();
    const ctype = ext && mimes_default[ext] || meta?.type || ext;
    const headers2 = { "cache-control": CACHE_CONTROL };
    let tag;
    if (meta) {
      const stamp = meta.modified ? meta.modified.getTime() : 0;
      tag = `W/"${meta.size.toString(16)}-${stamp.toString(16)}"`;
      headers2.etag = tag;
      if (meta.modified) headers2["last-modified"] = meta.modified.toUTCString();
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
      const meta = route.options ?? {};
      const config2 = getConfig(route.options?.schema);
      if (typeof path !== "string" || path === "*" || path === specPath) {
        continue;
      }
      const normalizedPath = path.replace(/\(\w+\)/gi, "").replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      if (!paths[normalizedPath]) {
        paths[normalizedPath] = {};
      }
      let requestBody;
      if (meta?.body) {
        const schema = await toJsonSchema(meta.body);
        requestBody = { content: { "application/json": { schema } } };
      }
      let responses;
      if (meta?.response) {
        const schema = await toJsonSchema(meta.response);
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
      if (meta?.query) {
        const schema = await toJsonSchema(meta.query);
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
        summary: config2.title || `${method.toUpperCase()} ${normalizedPath}`,
        description: config2.description || "",
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
import { default as default2 } from "polystore";
import { default as default3 } from "bucket";
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
    app.use(session);
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
  default3 as bucket,
  cache,
  cookies,
  server as default,
  download,
  file,
  headers,
  json,
  default2 as kv,
  redirect,
  router,
  send,
  status,
  type
};
