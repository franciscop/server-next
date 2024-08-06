export default class ServerError extends Error {
  constructor(code, status, message, vars = {}) {
    if (typeof message === "function") {
      message = message(vars);
    }
    for (let key in vars) {
      if (typeof message === "string") {
        message = message.replaceAll(`{${key}}`, vars[key]);
      }
    }

    super(message);
    this.code = code;
    this.message = message;
    this.status = status;
  }
  static extend(errors) {
    for (let code in errors) {
      const message = errors[code]?.message || errors[code];
      const status = errors[code]?.status;
      ServerError[code] = (vars) =>
        new ServerError(code, status, message, vars);
    }
    return errors;
  }
}
