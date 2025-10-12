export default class ServerError extends Error {
  constructor(code, status, message, vars = {}) {
    if (typeof message === "function") {
      message = message(vars);
    }
    if (typeof message !== "string") throw Error(`Invalid error ${message}`);
    for (const key in vars) {
      let val = vars[key];
      if (Array.isArray(val)) val = vars[key].join(",");
      message = message.replaceAll(`{${key}}`, val);
    }

    super(message);
    this.code = code;
    this.message = message;
    this.status = status;
  }
  static extend(errors) {
    for (const code in errors) {
      const message = errors[code]?.message || errors[code];
      const status = errors[code]?.status;
      ServerError[code] = (vars) =>
        new ServerError(code, status, message, vars);
    }
    return errors;
  }
}
