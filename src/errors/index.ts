import type { StandardIssue } from "../pipeline/standardSchema";

type Variables = Record<string, string | string[]>;

// What `onError` is handed: any thrown value, plus the fields the
// framework's own errors carry. All optional, since a handler can throw
// anything at all.
export type RequestError = Error & {
  // The stable identifier to branch on, like 'UPLOAD_TOO_LARGE'. See
  // https://server-js.com/documentation/errors
  code?: string;
  status?: number;
  // How to fix it, for whoever configured the app. Logged and shown in
  // development, never sent to a client in production.
  hint?: string;
  // Which fields a schema rejected, on INVALID_REQUEST and VALIDATION_FAILED
  issues?: readonly StandardIssue[];
};

// One definition per code: the status and message the client sees, and the
// hint for whoever configured the app (logged and shown in development, never
// sent to a client in production). Not every code needs a hint: one earns its
// place when the fix is a setting, an environment variable or a line of app
// code, and reads as an instruction.
type ErrorDef = { status: number; message: string; hint?: string };
type ExtendError = string | { message: string; status: number; hint?: string };

// Use an interface to type the static side of the class
interface ServerErrorConstructor {
  extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
  [key: string]: ((vars?: Variables) => ServerError) | any;
}

// Every registered code, built-in and app-registered alike, so a hint always
// travels with its status and message instead of living in a parallel map.
const registry: Record<string, ErrorDef> = {};

// The definition behind a registered code, for subclasses (ValidationError)
// that need to construct themselves rather than go through the factory.
export const definition = (code: string): ErrorDef | undefined => registry[code];

class ServerError extends Error {
  code: string;
  status: number;
  hint?: string;

  constructor(
    code: string,
    status: number,
    message: string | ((vars: Variables) => string),
    vars: Variables = {},
  ) {
    let messageStr: string;
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
    this.status = status;
    this.hint = registry[code]?.hint;
  }

  static extend(errors: Record<string, ExtendError>) {
    for (const code in errors) {
      const raw = errors[code];
      const def: ErrorDef =
        typeof raw === "string" ? { status: 500, message: raw } : raw;
      registry[code] = def;
      (ServerError as ServerErrorConstructor)[code] = (vars: Variables = {}) =>
        new ServerError(code, def.status, def.message, vars);
    }
    return errors;
  }
}

ServerError.extend({
  NOT_FOUND: {
    status: 404,
    message: "Not Found",
    hint:
      "No route matched. Register a catch-all last to answer with your own " +
      "page: `.get(() => <MissingPage />)`, since routes are tried in the " +
      "order they were added and the first match wins.",
  },
  METHOD_NOT_ALLOWED: {
    status: 405,
    message: 'The HTTP method "{method}" is not supported',
    hint:
      "Only GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS are routed. A " +
      "client sending anything else is usually a proxy or a scanner.",
  },
  PATH_TRAVERSAL: {
    status: 400,
    message: "The route param '{param}' tries to climb the path ('{value}')",
    hint:
      "A route param pointed outside where it belongs. If this route " +
      "legitimately receives paths, set `security: { traversalProtection: false }`.",
  },
  INVALID_REQUEST: {
    status: 422,
    message: "Invalid request {source}",
    hint:
      "The route's schema rejected the request. The failing fields are on " +
      "`error.issues`, which a custom `onError` can shape into an API response.",
  },
  VALIDATION_FAILED: {
    status: 500,
    message: "Server Error",
    hint:
      "The handler returned something its own `response` schema rejects, so " +
      "this is a bug in the route rather than in the request.",
  },
  BODY_TOO_LARGE: {
    status: 413,
    message: "Request body exceeds the {limit} limit",
    hint:
      "Raise it with `security: { maxBodySize: '10mb' }`, or " +
      "`maxBodySize: false` to disable the cap. It only bounds what is held in " +
      "memory; uploaded files stream to `uploads` and have their own limits.",
  },
  BODY_INVALID_MULTIPART: {
    status: 400,
    message: "A multipart/form-data body needs a boundary",
    hint:
      "The client set `Content-Type: multipart/form-data` by hand. Let it be " +
      "set automatically (send a FormData and omit the header) so the boundary " +
      "is included.",
  },
  UPLOAD_NOT_CONFIGURED: {
    status: 500,
    message: 'A file ("{name}") was uploaded but `uploads` is not configured',
    hint:
      "Set `uploads: './uploads'` (or a Bucket) to store files, or " +
      "`uploads: false` to ignore file fields on purpose.",
  },
  UPLOAD_TOO_LARGE: {
    status: 413,
    message: 'File "{name}" is too large ({size} bytes, limit is {limit})',
    hint:
      "Raise it with `uploads: { bucket, maxFileSize: '50mb' }`. " +
      "`maxTotalSize` bounds one request's files together, and both default to " +
      "10mb and 100mb.",
  },
  UPLOAD_TOO_MANY_FILES: {
    status: 413,
    message: "Too many files in one request (the limit is {limit})",
    hint:
      "Raise it with `uploads: { bucket, maxFiles: 500 }`. It defaults to 100, " +
      "which bounds how many objects one request can create.",
  },
  UPLOAD_TOO_SMALL: {
    status: 400,
    message: 'File "{name}" is too small ({size} bytes, minimum is {limit})',
    hint: "Set or lower `uploads: { bucket, minSize: '1kb' }`.",
  },
  UPLOAD_TYPE_NOT_ALLOWED: {
    status: 415,
    message:
      'File type not allowed for "{name}" (got "{type}", allowed: {allowed})',
    hint:
      "`fileType` accepts extensions ('.jpg') and MIME types ('image/jpeg'). " +
      "It is checked against the file's real format when the bytes identify " +
      "one, so a mislabelled file is refused even if its name matches.",
  },
  AUTH_INVALID_TOKEN: {
    status: 401,
    message: "Invalid Authorization token",
    hint:
      "The bearer token did not verify: check the issuer and audience, and " +
      "that the token has not expired.",
  },
  AUTH_INVALID_HEADER: {
    status: 401,
    message:
      "Invalid authorization header {type}, must send 'Bearer {TOKEN}' (with space)",
    hint: "The Authorization header must read `Bearer <token>`, with a space.",
  },
  AUTH_INVALID_STATE: {
    status: 403,
    message: "Invalid OAuth state",
    hint:
      "The OAuth state cookie was missing or did not match. It is signed with " +
      "`secrets`, lives for 10 minutes, and needs the callback to be on the " +
      "same origin as the login.",
  },
  AUTH_ISSUER_UNREACHABLE: {
    status: 502,
    message: "Cannot reach the OIDC issuer at {url}",
    hint:
      "The issuer's discovery document could not be fetched. Check the " +
      "`issuer` URL (it must serve /.well-known/openid-configuration) and " +
      "that this server has network access to it.",
  },
  AUTH_NO_CODE: {
    status: 400,
    message: "Missing the OAuth 'code' in the callback URL",
    hint:
      "The provider redirected back without a `code`. Check the callback URL " +
      "registered with the provider matches /auth/callback/<name>.",
  },
});

// Tell TypeScript that the class matches the interface
const TypedServerError = ServerError as typeof ServerError &
  ServerErrorConstructor;
export default TypedServerError;
