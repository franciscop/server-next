import auth from "../auth/index.js";
import Bucket from "./bucket.js";
import createId from "./createId";
import debugInfo from "./debugInfo.ts";

import { Cors, Options, Settings } from "../types";

const env = globalThis.env;

// Big mess; parse all of the options for server, which can be at launch time
// or dynamically per-request for the functions (so have to read ENV inside)
export default function config(options: Options = {}): Settings {
  const settings: Settings = {
    port: options.port || env.PORT || 3000,
    secret: options.secret || env.SECRET || `unsafe-${createId()}`,
  };

  // CORS
  options.cors = options.cors || env.CORS || null;
  if (options.cors) {
    const cors: Cors = {
      origin: "",
      methods: "",
      headers: "",
    };

    // TODO: replace '*' for request url
    if (options.cors === true) {
      cors.origin = "*";
    } else if (typeof options.cors === "string") {
      cors.origin = options.cors;
    } else if (Array.isArray(options.cors)) {
      cors.origin = options.cors.join(",");
    } else if (!options.cors.origin) {
      // cors is defined {}, but no explicit origin
      cors.origin = "*";
    } else if (typeof options.cors.origin === "string") {
      options.cors.origin = options.cors.origin;
    } else if (Array.isArray(options.cors.origin)) {
      cors.origin = options.cors.origin.join(",");
    }
    cors.origin = cors.origin.toLowerCase();

    if (typeof options.cors === "object" && !("methods" in options.cors)) {
      cors.methods = "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS";
    }
    // TODO: I don't think this is it
    if (typeof options.cors === "object" && !("headers" in options.cors)) {
      cors.headers = "*";
    }

    settings.cors = cors;
  }

  // Bucket
  settings.views = options.views ? Bucket(options.views) : null;
  debugInfo(options, "views", (views) => views?.location || "true", "📂");
  settings.public = options.public ? Bucket(options.public) : null;
  debugInfo(options, "public", (pub) => pub?.location || "true", "📂");
  settings.uploads = options.uploads ? Bucket(options.uploads) : null;
  debugInfo(options, "uploads", (ups) => ups?.location || "true", "📂");

  // Stores
  settings.store = options.store ?? null;
  debugInfo(options, "store", (store) => store?.name || "working");
  settings.cookies = options.cookies ?? null;
  debugInfo(options, "cookies");
  if (options.store && !options.session) {
    settings.session = { store: options.store.prefix("session:") };
  }
  debugInfo(options, "session");

  // AUTH
  settings.auth = auth.parseOptions(options.auth || env.AUTH || null, options);

  // OpenAPI
  if (options.openapi) {
    if (options.openapi === true) {
      settings.openapi = {};
    }
    // TODO
  }

  return settings;
}
