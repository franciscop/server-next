import ServerError from "../ServerError.js";

ServerError.extend({
  NO_STORE: "You need a 'store' to write 'ctx.session'",
  NO_STORE_WRITE: "You need a 'store' to write 'ctx.session.{key}'",
  NO_STORE_READ: "You need a 'store' to read 'ctx.session.{key}'",
  AUTH_ARGON_NEEDED:
    "Argon2 is needed for the auth module, please install it with 'npm i argon2'",
  AUTH_INVALID_TYPE: "Invalid Authorization type, '{type}'",
  AUTH_INVALID_TOKEN: "Invalid Authorization token",
  AUTH_INVALID_COOKIE: "Invalid Authorization cookie",
  AUTH_NO_PROVIDER: "No provider passed to the option 'auth.provider'",
  AUTH_INVALID_PROVIDER:
    "Invalid provider '{provider}', valid ones are: '{valid}'",
  AUTH_NO_SESSION: { status: 401, message: "Invalid session" },
  AUTH_NO_USER: {
    status: 401,
    message: "Credentials do not correspond to a user",
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
