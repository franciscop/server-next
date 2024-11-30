import Bucket from "./bucket.js";
import createId from "./createId.js";

// Big mess; parse all of the options for server, which can be at launch time
// or dynamically per-request for the functions (so have to read ENV inside)
export default function config(options = {}) {
  const env = globalThis.env;

  // Basic options
  options.port = options.port || env.PORT || 3000;
  options.secret = options.secret || env.SECRET || "unsafe-" + createId();

  // CORS
  options.cors = options.cors || env.CORS || null;
  if (options.cors === true) {
    options.cors = { origin: options.domain || "*" };
  }
  if (typeof options.cors === "string") {
    options.cors = { origin: options.cors };
  }
  if (options.cors && typeof options.cors.origin === "string") {
    options.cors.origin = options.cors.origin.toLowerCase();
  }
  if (options.cors && !options.cors.methods) {
    options.cors.methods = "GET,HEAD,POST,PUT,PATCH";
  }
  if (options.cors && !options.cors.headers) {
    options.cors.methods = "*";
  }

  // Bucket
  options.views = options.views ? Bucket(options.views) : null;
  options.public = options.public ? Bucket(options.public) : null;
  options.uploads = options.uploads ? Bucket(options.uploads) : null;

  // Stores
  options.store = options.store ?? null;
  options.cookies = options.cookies ?? {};
  if (options.store && options.cookies) {
    options.session = { store: options.store.prefix("session:") };
  }

  // AUTH
  options.auth = options.auth || env.AUTH || null;
  if (options.auth) {
    if (typeof options.auth !== "object") {
      const [type, provider] = options.auth.split(":");
      options.auth = { type, provider };
    }
    if (typeof options.auth.provider === "string") {
      options.auth.provider === options.auth.provider.split("|");
    }
    if (!options.auth.type) {
      throw new Error("Auth options needs a type");
    }
    if (!options.auth.provider) {
      throw new Error("Auth options needs a provider");
    }
    if (!options.auth.session && options.store) {
      options.auth.session = options.store.prefix("auth:");
    }
    if (!options.auth.store && options.store) {
      options.auth.store = options.store.prefix("user:");
    }
    if (!options.auth.cleanUser) {
      options.auth.cleanUser = (fullUser) => {
        const { password, token, ...user } = fullUser;
        return user;
      };
    }
    if (!options.auth.redirect) {
      options.auth.redirect = "/user";
    }
  }

  return options;
}
