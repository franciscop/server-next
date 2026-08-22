import ServerError from "../ServerError";

ServerError.extend({
  PATH_TRAVERSAL: {
    status: 400,
    message:
      "The route param '{param}' tries to climb the path ('{value}'). If this route legitimately receives paths, set security: { traversalProtection: false }",
  },
  AUTH_INVALID_TOKEN: { status: 401, message: "Invalid Authorization token" },
  AUTH_NO_CODE: {
    status: 400,
    message: "Missing the OAuth 'code' in the request body",
  },
  AUTH_INVALID_HEADER: {
    status: 401,
    message:
      "Invalid authorization header {type}, must send 'Bearer {TOKEN}' (with space)",
  },
  AUTH_INVALID_STATE: { status: 403, message: "Invalid OAuth state" },
});

export default ServerError;
