import auth from "../auth/index.js";
import Bucket from "./bucket.js";
import createId from "./createId.js";
import debugInfo from "./debugInfo.js";

// Big mess; parse all of the options for server, which can be at launch time
// or dynamically per-request for the functions (so have to read ENV inside)
export default function config(options = {}) {
  const env = globalThis.env;

  // Basic options
  options.port = options.port || env.PORT || 3000;
  options.secret = options.secret || env.SECRET || `unsafe-${createId()}`;

  // CORS
  options.cors = options.cors || env.CORS || null;
  if (options.cors) {
    if (options.cors === true) {
      options.cors = { origin: options.cors };
    }
    if (typeof options.cors === "string") {
      options.cors = { origin: options.cors };
    }
    if (Array.isArray(options.cors)) {
      options.cors = { origin: options.cors };
    }
    if (Array.isArray(options.cors.origin)) {
      options.cors.origin = options.cors.origin.join(",");
    }
    if (typeof options.cors.origin === "string") {
      options.cors.origin = options.cors.origin.toLowerCase();
    }

    if (!options.cors.methods) {
      options.cors.methods = "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS";
    }
    if (!options.cors.headers) {
      options.cors.headers = "*";
    }
  }

  // Bucket
  options.views = options.views ? Bucket(options.views) : null;
  debugInfo(options, "views", (views) => views?.location || "true", "📂");
  options.public = options.public ? Bucket(options.public) : null;
  debugInfo(options, "public", (pub) => pub?.location || "true", "📂");
  options.uploads = options.uploads ? Bucket(options.uploads) : null;
  debugInfo(options, "uploads", (ups) => ups?.location || "true", "📂");

  // Stores
  options.store = options.store ?? null;
  debugInfo(options, "store", (store) => store?.name || "working");
  options.cookies = options.cookies ?? null;
  debugInfo(options, "cookies", "persisting");
  if (options.store && !options.session) {
    options.session = { store: options.store.prefix("session:") };
  }
  debugInfo(options, "session", "persisting");

  // AUTH
  options.auth = auth.parseOptions(options.auth || env.AUTH || null, options);

  // OpenAPI
  if (options.openapi) {
    if (options.openapi === true) {
      options.openapi = {};
    }
  }

  return options;
}
