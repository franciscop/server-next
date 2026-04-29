import parseAuthOptions from "../auth/parseAuthOptions";
import Bucket from "./bucket";
import createId from "./createId";
import { UploadPipeline } from "./upload";

import type { CorsSettings, Options, Settings } from "..";

export default function config(options: Options = {}): Settings {
  const env = globalThis.env;
  const settings: Settings = {
    port: options.port || env.PORT || 3000,
    secret: options.secret || env.SECRET || `unsafe-${createId()}`,
  };

  // CORS
  options.cors = options.cors || env.CORS || null;
  if (options.cors) {
    const cors: CorsSettings = {
      origin: "",
      methods: "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
      headers: "*",
    };

    // TODO: replace '*' for request url
    if (options.cors === true) {
      cors.origin = true;
    } else if (typeof options.cors === "string") {
      cors.origin = options.cors;
    } else if (Array.isArray(options.cors)) {
      cors.origin = options.cors.join(",");
    } else if (typeof options.cors === "object") {
      if (!options.cors.origin) {
        // cors is defined {}, but no explicit origin
        cors.origin = "*";
      } else if (typeof options.cors.origin === "string") {
        cors.origin = options.cors.origin;
      } else if (Array.isArray(options.cors.origin)) {
        cors.origin = options.cors.origin.join(",");
      }

      if ("methods" in options.cors) {
        cors.methods = Array.isArray(options.cors.methods)
          ? options.cors.methods.join(",")
          : options.cors.methods;
      }

      if ("headers" in options.cors) {
        cors.headers = Array.isArray(options.cors.headers)
          ? options.cors.headers.join(",")
          : options.cors.headers;
      }
    }

    if (typeof cors.origin === "string") {
      cors.origin = cors.origin.toLowerCase();
    }

    settings.cors = cors;
  }

  // Bucket
  settings.views = options.views ? Bucket(options.views) : null;
  settings.public = options.public ? Bucket(options.public) : null;
  settings.uploads =
    options.uploads instanceof UploadPipeline
      ? options.uploads
      : options.uploads
        ? Bucket(options.uploads)
        : null;

  // Stores
  settings.store = options.store ?? null;
  settings.cookies = options.cookies ?? null;
  if (options.session) {
    settings.session =
      "store" in options.session ? options.session : { store: options.session };
  }
  if (options.store && !options.session) {
    settings.session = { store: options.store.prefix("session:") };
  }

  if (options.auth || env.AUTH) {
    settings.auth = parseAuthOptions(options.auth || env.AUTH || null, options);
  }

  // OpenAPI
  if (options.openapi) {
    if (options.openapi === true) {
      settings.openapi = {};
    }
    // TODO
  }

  settings.onError =
    options.onError ||
    ((error: Error & { status: number }) => {
      return new Response(error.message || "Server Error", {
        status: error.status || 500,
      });
    });

  return settings;
}
