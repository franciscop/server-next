import ServerError from "../ServerError";

ServerError.extend({
  PATH_TRAVERSAL: {
    status: 400,
    message:
      "The route param '{param}' tries to climb the path ('{value}'). If this route legitimately receives paths, set security: { traversalProtection: false }",
  },
  AUTH_ARGON_NEEDED:
    "Argon2 is needed for the auth module, please install it with 'npm i argon2'",
  AUTH_INVALID_TOKEN: { status: 401, message: "Invalid Authorization token" },
  AUTH_NO_CODE: {
    status: 400,
    message: "Missing the OAuth 'code' in the request body",
  },
  SESSION_JWT:
    "The `jwt` strategy is stateless, so there is no `ctx.session` (tried '{key}'). Use the `token` strategy for server-side sessions, or `cookie` for browsers",
  SESSION_GUEST:
    "No `ctx.session` for this request (tried '{key}'): the `token` strategy carries the session in the Authorization header, and this request has none. Sign in first, or use the `cookie` strategy for guest sessions",
  AUTH_INVALID_HEADER: {
    status: 401,
    message:
      "Invalid authorization header {type}, must send 'Bearer {TOKEN}' (with space)",
  },
  AUTH_INVALID_STATE: { status: 403, message: "Invalid OAuth state" },
  AUTH_NO_PROVIDER: "No provider passed to the option 'auth.providers'",
  AUTH_INVALID_PROVIDER: {
    status: 401,
    message: "Invalid provider '{provider}', valid ones are: '{valid}'",
  },
  AUTH_NO_SESSION: { status: 401, message: "Invalid session" },
  AUTH_NO_USER: {
    status: 401,
    message: "Credentials do not correspond to a user",
  },
  AUTH_INVALID_USER: {
    status: 500,
    message: "{callback} must return a user with an 'id' and an 'email'",
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
  REGISTER_EMAIL_EXISTS: "Email is already registered",
});

export default ServerError;
