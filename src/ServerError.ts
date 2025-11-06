type Variables = Record<string, string | string[]>;
type ExtendError = string | { message: string; status: number };

export default class ServerError extends Error {
  code: string;
  status: number;

  constructor(
    code: string,
    status: number,
    message: string | ((vars: Variables) => string),
    vars: Variables = {},
  ) {
    if (typeof message === "function") {
      message = message(vars);
    }
    if (typeof message !== "string") throw Error(`Invalid error ${message}`);

    for (const key in vars) {
      let value = vars[key];
      value = Array.isArray(value) ? value.join(",") : value;
      message = message.replaceAll(`{${key}}`, value);
    }

    super(message);
    this.code = code;
    this.message = message;
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
