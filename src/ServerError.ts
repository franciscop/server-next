type Variables = Record<string, string | string[]>;
type ExtendError = string | { message: string; status: number };

class ServerError extends Error {
  code: string;
  status: number;

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
  }

  // Add error codes dynamically to the global object
  static extend(errors: Record<string, ExtendError>) {
    for (const code in errors) {
      const error = errors[code];
      if (typeof error === "string") {
        ServerError[code] = (vars: Variables = {}) =>
          new ServerError(code, 500, error, vars);
      } else {
        ServerError[code] = (vars: Variables = {}) =>
          new ServerError(code, error.status, error.message, vars);
      }
    }
    return errors;
  }

  // Dynamically added error methods from errors/index.ts
  static NO_STORE: (vars?: Variables) => ServerError;
  static NO_STORE_WRITE: (vars?: Variables) => ServerError;
  static NO_STORE_READ: (vars?: Variables) => ServerError;
  static AUTH_ARGON_NEEDED: (vars?: Variables) => ServerError;
  static AUTH_INVALID_TYPE: (vars?: Variables) => ServerError;
  static AUTH_INVALID_TOKEN: (vars?: Variables) => ServerError;
  static AUTH_INVALID_COOKIE: (vars?: Variables) => ServerError;
  static AUTH_NO_PROVIDER: (vars?: Variables) => ServerError;
  static AUTH_INVALID_PROVIDER: (vars?: Variables) => ServerError;
  static AUTH_NO_SESSION: (vars?: Variables) => ServerError;
  static AUTH_NO_USER: (vars?: Variables) => ServerError;
  static LOGIN_NO_EMAIL: (vars?: Variables) => ServerError;
  static LOGIN_INVALID_EMAIL: (vars?: Variables) => ServerError;
  static LOGIN_NO_PASSWORD: (vars?: Variables) => ServerError;
  static LOGIN_INVALID_PASSWORD: (vars?: Variables) => ServerError;
  static LOGIN_WRONG_EMAIL: (vars?: Variables) => ServerError;
  static LOGIN_WRONG_PASSWORD: (vars?: Variables) => ServerError;
  static REGISTER_NO_EMAIL: (vars?: Variables) => ServerError;
  static REGISTER_INVALID_EMAIL: (vars?: Variables) => ServerError;
  static REGISTER_NO_PASSWORD: (vars?: Variables) => ServerError;
  static REGISTER_INVALID_PASSWORD: (vars?: Variables) => ServerError;
  static REGISTER_EMAIL_EXISTS: (vars?: Variables) => ServerError;
}

export default ServerError;
