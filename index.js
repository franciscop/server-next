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
  // Add error codes dynamically to the global object
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
  // Dynamically added error methods from errors/index.ts
  static NO_STORE;
  static NO_STORE_WRITE;
  static NO_STORE_READ;
  static AUTH_ARGON_NEEDED;
  static AUTH_INVALID_TYPE;
  static AUTH_INVALID_TOKEN;
  static AUTH_INVALID_COOKIE;
  static AUTH_NO_PROVIDER;
  static AUTH_INVALID_PROVIDER;
  static AUTH_NO_SESSION;
  static AUTH_NO_USER;
  static LOGIN_NO_EMAIL;
  static LOGIN_INVALID_EMAIL;
  static LOGIN_NO_PASSWORD;
  static LOGIN_INVALID_PASSWORD;
  static LOGIN_WRONG_EMAIL;
  static LOGIN_WRONG_PASSWORD;
  static REGISTER_NO_EMAIL;
  static REGISTER_INVALID_EMAIL;
  static REGISTER_NO_PASSWORD;
  static REGISTER_INVALID_PASSWORD;
  static REGISTER_EMAIL_EXISTS;
};
var ServerError_default = ServerError;

// src/errors/index.ts
ServerError_default.extend({
  NO_STORE: "You need a 'store' to write 'ctx.session'",
  NO_STORE_WRITE: "You need a 'store' to write 'ctx.session.{key}'",
  NO_STORE_READ: "You need a 'store' to read 'ctx.session.{key}'",
  AUTH_ARGON_NEEDED: "Argon2 is needed for the auth module, please install it with 'npm i argon2'",
  AUTH_INVALID_TYPE: "Invalid Authorization type, '{type}'",
  AUTH_INVALID_TOKEN: "Invalid Authorization token",
  AUTH_INVALID_COOKIE: "Invalid Authorization cookie",
  AUTH_NO_PROVIDER: "No provider passed to the option 'auth.provider'",
  AUTH_INVALID_PROVIDER: "Invalid provider '{provider}', valid ones are: '{valid}'",
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

// src/helpers/createCookies.ts
function createCookies(cookies2) {
  if (!cookies2 || !Object.keys(cookies2).length) return [];
  return Object.entries(cookies2).map(([key, val]) => {
    if (!val) {
      val = { value: "", expires: (/* @__PURE__ */ new Date(0)).toUTCString() };
    }
    if (typeof val === "string") {
      val = { value: val };
    }
    const { value, path: path2, expires } = val;
    const pathPart = `;Path=${path2 || "/"}`;
    const expiresPart = expires ? `;Expires=${expires}` : "";
    return `${key}=${value || ""}${pathPart}${expiresPart}`;
  });
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

// src/helpers/createWebsocket.ts
function createWebsocket(sockets, handlers) {
  return {
    message: async (socket, body) => {
      handlers.socket?.filter((s) => s[1] === "message")?.map((s) => s[2]({ socket, sockets, body }));
    },
    open: (socket) => {
      sockets.push(socket);
      handlers.socket?.filter((s) => s[1] === "open")?.map((s) => s[2]({ socket, sockets, body: void 0 }));
    },
    close: (socket) => {
      sockets.splice(sockets.indexOf(socket), 1);
      handlers.socket?.filter((s) => s[1] === "close")?.map((s) => s[2]({ socket, sockets, body: void 0 }));
    }
  };
}

// src/auth/auth.ts
var validateToken = (authorization) => {
  const [type2, id] = authorization.trim().split(" ");
  if (type2.toLowerCase() !== "bearer") {
    throw ServerError_default.AUTH_INVALID_TYPE({ type: type2 });
  }
  if (id.length !== 16) {
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
var findSessionId = (ctx) => {
  const type2 = ctx.options.auth.type;
  if (type2.includes("token")) {
    if (!ctx.headers.authorization) return;
    return validateToken(ctx.headers.authorization);
  }
  if (type2.includes("cookie")) {
    if (!ctx.cookies.authentication) return;
    return validateCookie(ctx.cookies.authentication);
  }
  throw new Error(`Invalid auth type "${type2}"`);
};
async function auth(ctx) {
  if (!ctx.options.auth) return;
  const options = ctx.options.auth;
  const sessionId = findSessionId(ctx);
  if (!sessionId) return;
  const auth3 = await options.session.get(sessionId);
  if (!auth3) return;
  if (!auth3.provider) throw ServerError_default.AUTH_NO_PROVIDER();
  if (!options.provider.includes(auth3.provider)) {
    throw ServerError_default.AUTH_INVALID_PROVIDER({
      provider: auth3.provider,
      valid: options.provider
    });
  }
  return auth3;
}

// src/reply.ts
var Reply = class {
  res;
  constructor() {
    this.res = {
      headers: {},
      cookies: {}
    };
  }
  generateHeaders() {
    const headers2 = new Headers(this.res.headers);
    for (const cookie of createCookies(this.res.cookies)) {
      headers2.append("set-cookie", cookie);
    }
    return headers2;
  }
  status(status2) {
    this.res.status = status2;
    return this;
  }
  type(type2) {
    if (!type2) return this;
    type2 = types_default[type2.replace(/^\./, "")] || type2;
    return this.headers({ "content-type": type2 });
  }
  download(name, type2) {
    if (name && !type2) type2 = name.split(".").pop();
    if (type2) this.type(type2);
    const filename = name ? `; filename="${name}"` : "";
    return this.headers({ "content-disposition": `attachment${filename}` });
  }
  headers(headers2) {
    if (!headers2 || typeof headers2 !== "object") return this;
    for (const key in headers2) {
      this.res.headers[key] = headers2[key];
    }
    return this;
  }
  cookies(cookies2) {
    if (!cookies2 || typeof cookies2 !== "object") return this;
    for (const key in cookies2) {
      if (typeof cookies2[key] === "string") {
        this.res.cookies[key] = { value: cookies2[key] };
      } else {
        this.res.cookies[key] = cookies2[key];
      }
    }
    return this;
  }
  json(body) {
    return this.headers({
      "content-type": "application/json"
    }).send(JSON.stringify(body));
  }
  redirect(Location) {
    return this.headers({ Location }).status(302).send();
  }
  async file(path2, renderer = async (data) => data) {
    try {
      const fs2 = await import("fs/promises");
      const data = await fs2.readFile(path2);
      const ext = path2.split(".").pop();
      return this.type(ext).send(await renderer(data));
    } catch (error) {
      if (error.code === "ENOENT") {
        return this.status(404).send();
      }
      throw error;
    }
  }
  async view(path2, renderer = async (data) => data, ctx) {
    if (!ctx?.options.views) {
      throw new Error("Views not enabled");
    }
    const data = await ctx.options.views.read(path2);
    if (!data) return this.status(404).send();
    return this.type(path2.split(".").pop()).send(await renderer(data));
  }
  send(body = "") {
    const { status: status2 = 200 } = this.res;
    if (typeof body === "string") {
      if (!this.res.headers["content-type"]) {
        const isHtml = body.startsWith("<");
        this.res.headers["content-type"] = isHtml ? "text/html" : "text/plain";
      }
      const headers2 = this.generateHeaders();
      return new Response(body, { status: status2, headers: headers2 });
    }
    const name = body?.constructor?.name;
    if (name === "Buffer") {
      const headers2 = this.generateHeaders();
      return new Response(body, { status: status2, headers: headers2 });
    }
    if (name === "ReadableStream") {
      const headers2 = this.generateHeaders();
      return new Response(body, { status: status2, headers: headers2 });
    }
    if (name === "PassThrough" || name === "Readable") {
      const headers2 = this.generateHeaders();
      return new Response(toWeb(body), { status: status2, headers: headers2 });
    }
    return this.json(body);
  }
};
var status = (...args) => new Reply().status(...args);
var headers = (...args) => new Reply().headers(...args);
var type = (...args) => new Reply().type(...args);
var download = (...args) => new Reply().download(...args);
var cookies = (...args) => new Reply().cookies(...args);
var send = (...args) => new Reply().send(...args);
var json = (...args) => new Reply().json(...args);
var file = (...args) => new Reply().file(...args);
var redirect = (...args) => new Reply().redirect(...args);
var view = (...args) => new Reply().view(...args);

// src/auth/logout.ts
async function logout(ctx) {
  const { id, type: type2 } = ctx.auth;
  await ctx.options.auth.session.del(id);
  if (type2.includes("token")) {
    return { token: null };
  }
  if (type2.includes("cookie")) {
    return cookies({ authorization: null }).redirect("/");
  }
  if (type2.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (type2.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
}

// src/auth/updateUser.ts
async function updateUser(user2, auth3, store) {
  if (auth3.provider === "email") {
    return await store.set(auth3.email, user2);
  }
}

// src/auth/providers/email.ts
var createSession = async (user2, ctx) => {
  const { type: type2, session: session2, cleanUser, redirect: redirect2 = "/user" } = ctx.options.auth;
  user2 = cleanUser(user2);
  const id = createId();
  const provider = "email";
  const time = (/* @__PURE__ */ new Date()).toISOString().replace(/\.[0-9]*/, "");
  ctx.auth = {
    id,
    type: type2,
    provider,
    user: user2.email,
    email: user2.email,
    time
  };
  await session2.set(id, ctx.auth, { expires: "1w" });
  if (type2.includes("token")) {
    return status(201).json({ ...user2, token: id });
  }
  if (type2.includes("cookie")) {
    return status(302).cookies({ authentication: id }).redirect(redirect2);
  }
  if (type2.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (type2.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
};
async function emailLogin(ctx) {
  const { email, password } = ctx.body;
  if (!email) throw ServerError_default.LOGIN_NO_EMAIL();
  if (!/@/.test(email)) throw ServerError_default.LOGIN_INVALID_EMAIL();
  if (!password) throw ServerError_default.LOGIN_NO_PASSWORD();
  if (password.length < 8) throw ServerError_default.LOGIN_INVALID_PASSWORD();
  const store = ctx.options.auth.store;
  if (!await store.has(email)) throw ServerError_default.LOGIN_WRONG_EMAIL();
  const user2 = await store.get(email);
  const isValid = await verify(password, user2.password);
  if (!isValid) throw ServerError_default.LOGIN_WRONG_PASSWORD();
  return createSession(user2, ctx);
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
  const user2 = {
    id: createId(email),
    email,
    password: await hash2(password),
    time,
    ...data
  };
  await store.set(email, user2);
  return createSession(user2, ctx);
}
async function emailResetPassword() {
}
async function emailUpdatePassword(ctx) {
  const { previous, updated } = ctx.body;
  const fullUser = await ctx.options.auth.store.get(ctx.auth.user);
  const isValid = await verify(previous, fullUser.password);
  if (!isValid) throw ServerError_default.LOGIN_WRONG_PASSWORD();
  fullUser.password = await hash2(updated);
  await updateUser(fullUser, ctx.auth, ctx.options.auth.store);
  return 200;
}
var email_default = {
  login: emailLogin,
  register: emailRegister,
  reset: emailResetPassword,
  password: emailUpdatePassword
};

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
var login = function githubLogin() {
  return redirect(
    `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_ID}&scope=user:email`
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
var callback = async (ctx) => {
  const { type: type2, cleanUser, store, session: session2, redirect: redirect2 } = ctx.options.auth;
  const profile = await getUserProfile(ctx.url.query.code);
  const auth3 = {
    id: createId(),
    type: type2,
    provider: "github",
    user: createId(profile.email),
    email: profile.email,
    time: (/* @__PURE__ */ new Date()).toISOString().replace(/\.[0-9]*/, "")
  };
  const user2 = cleanUser({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    picture: profile.avatar_url,
    location: profile.location,
    created: profile.created_at
  });
  await store.set(auth3.user, user2);
  await session2.set(auth3.id, auth3, { expires: "1w" });
  if (auth3.type.includes("token")) {
    return status(201).json({ ...user2, token: auth3.id });
  }
  if (auth3.type.includes("cookie")) {
    return status(302).cookies({ authentication: auth3.id }).redirect(redirect2);
  }
  if (auth3.type.includes("jwt")) {
    throw new Error("JWT auth not supported yet");
  }
  if (auth3.type.includes("key")) {
    throw new Error("Key auth not supported yet");
  }
  throw new Error("Unknown auth type");
};
var github_default = { login, callback };

// src/auth/providers/index.ts
var providers_default = { email: email_default, github: github_default };

// src/auth/NoSession.ts
var NoSession = class {
};
function createNoSession() {
  return new Proxy(new NoSession(), {
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
      } else {
        throw ServerError_default.NO_STORE_WRITE({ key: String(key) });
      }
    }
  });
}

// src/auth/session.ts
async function session(ctx) {
  const store = ctx.options.session?.store;
  if (!store) return createNoSession();
  if (ctx.cookies.session) {
    const session2 = await store.get(ctx.cookies.session);
    if (session2) return session2;
  }
  return {};
}

// src/auth/user.ts
async function user(ctx) {
  if (!ctx.auth) return;
  const user2 = await ctx.options.auth.store.get(ctx.auth.user);
  if (!user2) throw ServerError_default.AUTH_NO_USER();
  return ctx.options.auth.cleanUser(user2);
}

// src/auth/index.ts
var parseOptions = (auth3, all) => {
  if (!auth3) return null;
  if (typeof auth3 === "string") {
    const [type2, provider] = auth3.split(":");
    auth3 = { type: type2, provider };
  }
  if (typeof auth3.type === "string") {
    auth3.type = auth3.type.split("|").filter(Boolean);
  }
  if (typeof auth3.provider === "string") {
    auth3.provider = auth3.provider.split("|").filter(Boolean);
  }
  if (!auth3.type) {
    throw new Error("Auth options needs a type");
  }
  if (!auth3.type.length) {
    throw new Error("Auth options needs a type");
  }
  if (!auth3.provider || !auth3.provider.length) {
    throw new Error("Auth options needs a provider");
  }
  const providerNotFound = auth3.provider.find((p) => !providers_default[p]);
  if (providerNotFound) {
    throw new Error(
      `Provider "${providerNotFound}" not found, available ones are "${Object.keys(providers_default).join('", "')}"`
    );
  }
  if (!auth3.session && all.store) {
    auth3.session = all.store.prefix("auth:");
  }
  if (!auth3.store && all.store) {
    auth3.store = all.store.prefix("user:");
  }
  if (!auth3.cleanUser) {
    auth3.cleanUser = (fullUser) => {
      const { password: _password, ...user2 } = fullUser;
      return user2;
    };
  }
  if (!auth3.redirect) {
    auth3.redirect = "/user";
  }
  return auth3;
};
var load = async (ctx) => {
  ctx.session = await session(ctx);
  ctx.auth = await auth(ctx);
  ctx.user = await user(ctx);
};
var middle = async (ctx) => {
  if (ctx.options.auth) {
    if (ctx.options.auth.provider.includes("github")) {
      if (!env.GITHUB_ID) throw new Error("GITHUB_ID not defined");
      if (!env.GITHUB_SECRET) throw new Error("GITHUB_SECRET not defined");
      ctx.app.get(
        "/auth/logout",
        { tags: "Auth", title: "Github logout" },
        logout
      );
      ctx.app.get(
        "/auth/login/github",
        { tags: "Auth" },
        providers_default.github.login
      );
      ctx.app.get(
        "/auth/callback/github",
        { tags: "Auth", title: "Github callback" },
        providers_default.github.callback
      );
    }
    if (ctx.options.auth.provider.includes("email")) {
      ctx.app.post("/auth/logout", { tags: "Auth" }, logout);
      ctx.app.post(
        "/auth/register/email",
        { tags: "Auth" },
        providers_default.email.register
      );
      ctx.app.post(
        "/auth/login/email",
        { tags: "Auth" },
        providers_default.email.login
      );
      ctx.app.put(
        "/auth/password/email",
        { tags: "Auth" },
        providers_default.email.password
      );
      ctx.app.put(
        "/auth/reset/email",
        { tags: "Auth" },
        providers_default.email.reset
      );
    }
  }
};
var auth_default = { load, parseOptions, middle };

// src/helpers/bucket.ts
import * as fs from "fs";
import * as path from "path";
import * as fsp from "fs/promises";
function thinLocalBucket(root) {
  const absolute = (name) => {
    if (!name) throw new Error("File name is required");
    return path.resolve(path.join(root, name));
  };
  return {
    location: path.resolve(root),
    read: async (name) => {
      const fullPath = absolute(name);
      const stats = await fsp.stat(fullPath).catch(() => null);
      if (!stats || !stats.isFile()) return null;
      const nodeStream = fs.createReadStream(fullPath);
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
    },
    write: (name, value, type2) => {
      const fullPath = absolute(name);
      if (value) {
        return fsp.writeFile(fullPath, value, type2).then(() => fullPath);
      }
      return fs.createWriteStream(fullPath);
    },
    delete: async (name) => {
      const fullPath = absolute(name);
      try {
        await fsp.unlink(fullPath);
        return true;
      } catch {
        return false;
      }
    }
  };
}
function thinBunBucket(s3) {
  return {
    read: async (name) => {
      const file2 = s3.file(name);
      if (!await file2.exists()) return null;
      return await file2.stream();
    },
    write: async (name, value) => {
      const file2 = s3.file(name);
      if (value) {
        await file2.write(value);
        return name;
      }
      return s3.presign(name, { expiresIn: 3600, acl: "public-read-write" });
    },
    delete: async (name) => {
      const file2 = s3.file(name);
      if (!await file2.exists()) return null;
      return await file2.delete();
    }
  };
}
function bucket_default(root) {
  if (!root) return null;
  if (typeof root === "string") {
    return thinLocalBucket(root);
  }
  if (root.file && root.write) {
    return thinBunBucket(root);
  }
  return root;
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

// src/helpers/debugInfo.ts
var isDebug = process.argv.includes("--debug");
function debugInfo(options, name, cb, icon = "") {
  if (!isDebug) return;
  if (!options[name]) {
    console.log(color`options:${String(name)}\t→ {dim}[not set]{/}`);
    return;
  }
  console.log(
    color`options:${String(name)}\t→ ${icon ? `${icon} ` : ""}${cb(options[name])}`
  );
}

// src/helpers/config.ts
var env2 = globalThis.env;
function config(options = {}) {
  const settings = {
    port: options.port || env2.PORT || 3e3,
    secret: options.secret || env2.SECRET || `unsafe-${createId()}`
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
    }
    if (typeof cors2.origin === "string") {
      cors2.origin = cors2.origin.toLowerCase();
    }
    settings.cors = cors2;
  }
  settings.views = options.views ? bucket_default(options.views) : null;
  debugInfo(options, "views", (views) => views?.location || "true", "\u{1F4C2}");
  settings.public = options.public ? bucket_default(options.public) : null;
  debugInfo(options, "public", (pub) => pub?.location || "true", "\u{1F4C2}");
  settings.uploads = options.uploads ? bucket_default(options.uploads) : null;
  debugInfo(options, "uploads", (ups) => ups?.location || "true", "\u{1F4C2}");
  settings.store = options.store ?? null;
  debugInfo(options, "store", (store) => store?.name || "working", "\u{1F4E6}");
  settings.cookies = options.cookies ?? null;
  debugInfo(options, "cookies", (cookies2) => cookies2?.name || "working", "\u{1F36A}");
  if (options.store && !options.session) {
    settings.session = { store: options.store.prefix("session:") };
  }
  debugInfo(
    options,
    "session",
    (session2) => session2?.store?.name || "working",
    "\u{1F510}"
  );
  settings.auth = auth_default.parseOptions(options.auth || env2.AUTH || null, options);
  if (options.openapi) {
    if (options.openapi === true) {
      settings.openapi = {};
    }
  }
  return settings;
}

// src/helpers/cors.ts
var localhost = /^https?:\/\/localhost(:\d+)?$/;
function cors(config2, origin = "") {
  origin = origin.toLowerCase();
  if (config2 === true) return origin || null;
  if (config2 === "*") return "*";
  if (!origin) return null;
  if (localhost.test(origin)) return origin;
  const arr = Array.isArray(config2) ? config2 : typeof config2 === "string" ? config2.split(/\s*,\s*/g) : [];
  if (arr.includes(origin)) return origin;
  console.warn(`CORS: Origin "${origin}" not allowed. Allowed "${config2}"`);
  return null;
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
  if (!out && typeof out !== "string") return;
  if (typeof out === "function") {
    out = await out(ctx);
  }
  if (out instanceof Blob) {
    out = new Response(out, { headers: { "Content-Type": out.type } });
  }
  if (out instanceof ReadableStream) {
    out = new Response(out);
  }
  if (typeof out === "number") {
    out = new Response(void 0, { status: out });
  }
  if (typeof out === "string") {
    const type2 = /^\s*</.test(out) ? "text/html" : "text/plain";
    out = new Response(out, { headers: { "content-type": type2 } });
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
  if (ctx.options.cors) {
    const origin = cors(ctx.options.cors.origin, ctx.headers.origin);
    if (origin) {
      out.headers.set("Access-Control-Allow-Origin", origin);
      out.headers.set("Access-Control-Allow-Methods", ctx.options.cors.methods);
      out.headers.set("Access-Control-Allow-Headers", ctx.options.cors.headers);
      if (ctx.options.cors.credentials) {
        out.headers.set("Access-Control-Allow-Credentials", "true");
      }
    }
  }
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }
  if (Object.keys(ctx.session || {}).length) {
    if (!ctx.options.session?.store) {
      throw ServerError_default.NO_STORE({});
    }
    if (!ctx.cookies.session) {
      ctx.res.cookies.session = createId();
    }
    const id = ctx.cookies.session;
    ctx.options.session.store.set(id, ctx.session);
  }
  if (ctx.options.cookies) {
    if (Object.keys(ctx.res.cookies).length) {
      for (const cookie of ctx.res.cookies) {
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
  pattern = `/${pattern.replace(/^\//, "")}`;
  pattern = pattern.replace(/\/$/, "") || "/";
  path2 = path2.replace(/\/$/, "") || "/";
  if (pattern === path2) return {};
  const params = {};
  const pathParts = path2.split("/").slice(1);
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

// src/helpers/StatusError.ts
var StatusError = class extends Error {
  status;
  constructor(msg, status2 = 500) {
    super(msg);
    this.status = status2;
  }
};

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
async function handleRequest(handlers, ctx) {
  try {
    if (ctx.error) {
      throw ctx.error;
    }
    for (const [method, matcher, ...cbs] of handlers[ctx.method]) {
      const match = pathPattern(matcher, ctx.url.pathname || "/");
      if (!match) continue;
      define(ctx.url, "params", () => match);
      for (const cb of cbs) {
        if (typeof cb === "function") {
          const res = await cb(ctx);
          const out = await parseResponse(res, ctx);
          if (out) return out;
        } else {
          validate(ctx, cb);
        }
      }
      if (method !== "*") break;
    }
    if (ctx.machine?.provider === "netlify") return;
    return new Response("Not Found", { status: 404 });
  } catch (error) {
    return new Response(error.message || "", { status: error.status || 500 });
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

// src/helpers/types.ts
var types = {
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
var types_default = types;

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

// src/middle/assets.ts
async function assets(ctx) {
  if (!ctx.options.public) return;
  if (ctx.method !== "get") return;
  if (ctx.url.pathname === "/") return;
  try {
    const asset = await ctx.options.public.read(ctx.url.pathname);
    if (!asset) return;
    return type(ctx.url.pathname.split(".").pop()).send(asset);
  } catch {
  }
}

// src/middle/timer.ts
var createTime = () => {
  const times = [["init", performance.now()]];
  const time = (name) => times.push([name, performance.now()]);
  time.times = times;
  time.headers = () => {
    const r = (t) => Math.round(t);
    const times2 = time.times;
    const timing = times2.slice(1).map(([name, time2], i) => `${name};dur=${r(time2 - times2[i][1])}`).join(", ");
    return timing;
  };
  return time;
};
function timer(ctx) {
  ctx.time = createTime();
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
var getConfig = (routes) => {
  const config2 = routes.find(
    (r) => typeof r !== "string" && typeof r !== "function" && typeof r === "object"
  );
  if (!config2) return {};
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
      const [_, path2, fn, meta] = [
        route[0],
        route[1],
        route.find((p) => typeof p === "function"),
        route.find((p) => typeof p === "object")
      ];
      const config2 = getConfig(route);
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

// src/middle/index.ts
var auth2 = auth_default.middle;

// src/router.ts
var Router = class _Router {
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
  handle(method, path2, ...middleware) {
    if (typeof path2 !== "string") {
      middleware.unshift(path2);
      path2 = "*";
    }
    const methods = method === "*" ? Object.keys(this.handlers) : [method];
    for (const m of methods) {
      this.handlers[m].push([method, path2, ...middleware]);
    }
    return this.self();
  }
  socket(path2, ...middleware) {
    return this.handle("socket", path2, ...middleware);
  }
  get(path2, ...middleware) {
    return this.handle("get", path2, ...middleware);
  }
  head(path2, ...middleware) {
    return this.handle("head", path2, ...middleware);
  }
  post(path2, ...middleware) {
    return this.handle("post", path2, ...middleware);
  }
  put(path2, ...middleware) {
    return this.handle("put", path2, ...middleware);
  }
  patch(path2, ...middleware) {
    return this.handle("patch", path2, ...middleware);
  }
  del(path2, ...middleware) {
    return this.handle("delete", path2, ...middleware);
  }
  options(path2, ...middleware) {
    return this.handle("options", path2, ...middleware);
  }
  use(...args) {
    const path2 = typeof args[0] === "string" ? args.shift() : "*";
    if (args[0] instanceof _Router) {
      const basePath = `/${path2.replace(/\*$/, "")}/`.replace(/^\/+/, "/").replace(/\/+$/, "/");
      const handlers = args[0].handlers;
      for (const m in handlers) {
        for (const [method, path3, ...middleware] of handlers[m]) {
          const fullPath = basePath + path3.replace(/^\//, "");
          this.handlers[m].push([method, fullPath, ...middleware]);
        }
      }
      return this.self();
    }
    return this.handle("*", path2, ...args);
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
  return true;
}
function ServerTest(app) {
  const port = app.settings.port;
  const fetch2 = async (path2, method, options = {}) => {
    try {
      if (!options.headers) options.headers = {};
      if (isSerializable(options.body)) {
        options.headers["content-type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }
      const res = await app.fetch(
        new Request(`http://localhost:${port}${path2}`, {
          method,
          ...options
        })
      );
      const headers2 = parseHeaders_default(res.headers);
      let body;
      if (headers2["content-type"]?.includes("application/json")) {
        body = await res.json();
      } else {
        body = await res.text();
      }
      return { status: res.status, headers: headers2, body };
    } catch (error) {
      return { status: 500, headers: {}, body: error.message };
    }
  };
  return {
    get: (path2, options) => fetch2(path2, "get", options),
    head: (path2, options) => fetch2(path2, "head", options),
    post: (path2, body, options) => fetch2(path2, "post", { body, ...options }),
    put: (path2, body, options) => fetch2(path2, "put", { body, ...options }),
    patch: (path2, body, options) => fetch2(path2, "patch", { body, ...options }),
    delete: (path2, options) => fetch2(path2, "delete", options),
    options: (path2, options) => fetch2(path2, "options", options)
  };
}

// src/context/parseBody.ts
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
var saveFile = async (name, value, bucket) => {
  const ext = name.split(".").pop();
  const id = `${createId()}.${ext}`;
  await bucket.write(id, value);
  return id;
};
function splitBuffer(buffer, delimiter) {
  const result = [];
  let start = 0;
  let index = buffer.indexOf(delimiter);
  while (index !== -1) {
    result.push(buffer.slice(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }
  result.push(buffer.slice(start));
  return result;
}
var BREAK_BUFFER = Buffer.from("\r\n\r\n");
function isProbablyText(buffer) {
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    const byte = buffer[i];
    if (byte === 0) return false;
    if (byte < 7 || byte > 13 && byte < 32) return false;
  }
  return true;
}
async function parseBody(raw, contentType, bucket) {
  const contentTypeStr = Array.isArray(contentType) ? contentType[0] : contentType;
  let rawBuffer;
  if (raw instanceof Buffer) {
    rawBuffer = raw;
  } else if ("arrayBuffer" in raw && typeof raw.arrayBuffer === "function") {
    const arrayBuf = await raw.arrayBuffer();
    rawBuffer = Buffer.from(arrayBuf);
  } else {
    throw new Error("Unsupported raw type");
  }
  if (!rawBuffer) return {};
  if (!contentTypeStr || /text\/plain/.test(contentTypeStr)) {
    return rawBuffer.toString("utf-8");
  }
  if (/application\/json/.test(contentTypeStr)) {
    return JSON.parse(rawBuffer.toString("utf-8"));
  }
  const boundary = getBoundary(contentTypeStr);
  if (!boundary) return null;
  const body = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(rawBuffer, boundaryBuffer);
  for (const part of parts) {
    if (part.length === 0 || part.equals(Buffer.from("--\r\n"))) continue;
    const idx = part.indexOf(BREAK_BUFFER);
    if (idx === -1) continue;
    const headerStr = part.slice(0, idx).toString("utf-8");
    const contentBuf = part.slice(idx + BREAK_BUFFER.length, part.length - 2);
    const name = getMatching(headerStr, /name="(.+?)"/).trim().replace(/\[\]$/, "");
    if (!name) continue;
    const filename = getMatching(headerStr, /filename="(.+?)"/).trim();
    if (filename) {
      if (!bucket) throw new Error("Bucket is required to save files");
      body[name] = await saveFile(filename, contentBuf, bucket);
    } else {
      const value = isProbablyText(contentBuf) ? contentBuf.toString("utf-8").trim() : contentBuf;
      if (body[name]) {
        if (!Array.isArray(body[name])) body[name] = [body[name]];
        body[name].push(value);
      } else {
        body[name] = value;
      }
    }
  }
  return body;
}

// src/context/parseCookies.ts
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

// src/context/winter.ts
function isValidMethod(method) {
  return [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "socket"
  ].includes(method);
}
var winter_default = async (request, app) => {
  try {
    const ctx = {
      headers: {},
      cookies: {},
      url: void 0,
      options: app.settings || {},
      method: "get",
      init: performance.now(),
      req: request
    };
    const method = request.method.toLowerCase();
    if (!isValidMethod(method)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    ctx.method = method;
    const events = {};
    ctx.on = (name, callback2) => {
      events[name] = events[name] || [];
      events[name].push(callback2);
    };
    ctx.trigger = (name, data) => {
      if (!events[name]) return;
      for (const cb of events[name]) {
        cb(data);
      }
    };
    ctx.headers = parseHeaders_default(request.headers);
    ctx.cookies = parseCookies(ctx.headers.cookie);
    await auth_default.load(ctx);
    ctx.url = new URL(request.url.replace(/\/$/, ""));
    define(
      ctx.url,
      "query",
      (url) => Object.fromEntries(url.searchParams.entries())
    );
    if (request.body) {
      const type2 = ctx.headers["content-type"];
      ctx.body = await parseBody(request, type2, ctx.options.uploads);
    }
    ctx.app = app;
    ctx.platform = app.platform;
    ctx.machine = app.platform;
    return ctx;
  } catch (error) {
    return { error };
  }
};

// src/context/node.ts
function isValidMethod2(method) {
  return [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "socket"
  ].includes(method);
}
var chunkArray = (arr, size) => arr.length > size ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [arr];
var node_default = async (request, app) => {
  try {
    const ctx = {
      headers: {},
      cookies: {},
      url: void 0,
      options: app.settings || {},
      method: "get",
      req: request
    };
    const method = request.method?.toLowerCase() || "get";
    if (!isValidMethod2(method)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    ctx.method = method;
    const events = {};
    ctx.on = (name, callback2) => {
      events[name] = events[name] || [];
      events[name].push(callback2);
    };
    ctx.trigger = (name, data) => {
      if (!events[name]) return;
      for (const cb of events[name]) {
        cb(data);
      }
    };
    ctx.headers = parseHeaders_default(
      new Headers(chunkArray(request.rawHeaders, 2))
    );
    ctx.cookies = parseCookies(ctx.headers.cookie);
    await auth_default.load(ctx);
    const https = request.connection?.encrypted ? "https" : "http";
    const host = ctx.headers.host || `localhost:${ctx.options.port}`;
    const path2 = (request.url || "/").replace(/\/$/, "") || "/";
    ctx.url = new URL(path2, `${https}://${host}`);
    define(
      ctx.url,
      "query",
      (url) => Object.fromEntries(url.searchParams.entries())
    );
    await new Promise((resolve2, reject) => {
      const body = [];
      request.on("data", (chunk) => {
        body.push(chunk);
      }).on("end", async () => {
        const type2 = ctx.headers["content-type"];
        const concatenated = Buffer.concat(body);
        ctx.body = await parseBody(concatenated, type2, ctx.options.uploads);
        resolve2();
      }).on("error", reject);
    });
    ctx.app = app;
    ctx.platform = app.platform;
    ctx.machine = app.platform;
    return ctx;
  } catch (error) {
    return { error };
  }
};

// src/context/handlers.ts
var Winter = async (app, request, env3) => {
  if (env3?.upgrade(request)) return;
  Object.assign(globalThis.env, env3);
  const ctx = await winter_default(request, app);
  if ("error" in ctx) {
    throw ctx.error;
  }
  const res = await handleRequest(app.handlers, ctx);
  ctx.trigger("finish", { ...ctx, res, end: performance.now() });
  return res;
};
var Node = async (app) => {
  const http = await import("http");
  http.createServer(async (request, response) => {
    const ctx = await node_default(request, app);
    if ("error" in ctx) {
      throw ctx.error;
    }
    const out = await handleRequest(app.handlers, ctx);
    response.writeHead(out.status || 200, parseHeaders_default(out.headers));
    if (out.body instanceof ReadableStream) {
      await iterate(out.body, (chunk) => response.write(chunk));
    } else {
      response.write(out.body || "");
    }
    response.end();
  }).listen(app.settings.port);
};
var Netlify = async (app, request, context) => {
  request.context = context;
  if (typeof Netlify === "undefined") {
    throw new Error("Netlify doesn't exist");
  }
  const ctx = await winter_default(request, app);
  if ("error" in ctx) {
    throw ctx.error;
  }
  return await handleRequest(app.handlers, ctx);
};

// src/index.ts
var Server = class extends Router {
  settings;
  platform;
  sockets;
  websocket;
  // Needed to be explicit for Bun/WinterCG
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
    }
    this.use(timer);
    this.use(assets);
    if (this.settings.openapi) {
      this.get(this.settings.openapi.path || "/docs", openapi_default);
    }
    if (this.settings.auth) {
      this.use(auth2);
    }
  }
  // We need to return a function; some environment expect the default export
  // to be a function that is called with the request, but we also want to
  // allow chaining, so we return a function that "extends" the instance
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
  // The different handlers for different platforms/runtimes
  node() {
    return Node(this);
  }
  fetch(request, env3) {
    return Winter(this, request, env3);
  }
  callback(request, context) {
    return Netlify(this, request, context);
  }
  // Helper purely for testing
  test() {
    return ServerTest(this);
  }
};
function server(options = {}) {
  return new Server(options).self();
}
export {
  Reply,
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
  view
};
