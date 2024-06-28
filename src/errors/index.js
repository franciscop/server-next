import ServerError from "../ServerError.js";

ServerError.extend({
  NO_STORE: `You need a 'store' to write 'ctx.session'`,
  NO_STORE_WRITE: `You need a 'store' to write 'ctx.session.{key}'`,
  NO_STORE_READ: `You need a 'store' to read 'ctx.session.{key}'`,
  AUTH_INVALID_TYPE: `Invalid Authorization type, '{type}'`,
  AUTH_INVALID_TOKEN: `Invalid Authorization token`,

  LOGIN_NO_EMAIL: "The email is required to log in",
  LOGIN_INVALID_EMAIL: "The email you wrote is not correct",
  LOGIN_NO_PASSWORD: "The email is required to log in",
  LOGIN_INVALID_PASSWORD: "The email you wrote is not correct",
  LOGIN_WRONG_ACCOUNT: `That email does not correspond to any account`,
  LOGIN_WRONG_PASSWORD: `That is not the valid password`,
});

export default ServerError;
