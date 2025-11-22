type Variables = Record<string, string | string[]>;
type ExtendError = string | { message: string; status: number };

// Use an interface to type the static side of the class
interface ServerErrorConstructor {
  extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
  [key: string]: ((vars?: Variables) => ServerError) | any;
}

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

  static extend(errors: Record<string, ExtendError>) {
    for (const code in errors) {
      const error = errors[code];
      if (typeof error === "string") {
        (ServerError as ServerErrorConstructor)[code] = (
          vars: Variables = {},
        ) => new ServerError(code, 500, error, vars);
      } else {
        (ServerError as ServerErrorConstructor)[code] = (
          vars: Variables = {},
        ) => new ServerError(code, error.status, error.message, vars);
      }
    }
    return errors;
  }
}

// Tell TypeScript that the class matches the interface
const TypedServerError = ServerError as typeof ServerError &
  ServerErrorConstructor;
export default TypedServerError;
