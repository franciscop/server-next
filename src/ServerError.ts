type Variables = Record<string, string | string[]>;
type ExtendError = string | { message: string; status: number };

// Extended error methods added dynamically
interface ServerErrorConstructor {
  new (
    code: string,
    status: number,
    message: string | ((vars: Variables) => string),
    vars?: Variables,
  ): ServerError;
  extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
  [key: string]: any; // For dynamically added error methods
}

export default class ServerError extends Error {
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
      messageStr = messageStr.replaceAll(`{${key}}`, value);
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
        (ServerError as any)[code] = (vars: Variables = {}) =>
          new ServerError(code, 500, error, vars);
      } else {
        (ServerError as any)[code] = (vars: Variables = {}) =>
          new ServerError(code, error.status, error.message, vars);
      }
    }
    return errors;
  }
}
