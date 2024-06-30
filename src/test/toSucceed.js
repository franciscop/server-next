import { expect } from "@jest/globals";

const reset = "\x1b[0m";

const spaceOrEnter = (msg) => {
  if (typeof msg === "string") {
    return " ";
  }
  return "\n";
};

export default function toSucceed(request, message) {
  const pass = request.status >= 200 && request.status < 300;

  if (message && JSON.stringify(request.data) !== JSON.stringify(message)) {
    if (pass) {
      return {
        message: () =>
          `${reset}Expected body:${spaceOrEnter(
            message
          )}${this.utils.printExpected(message)}\nReceived body:${spaceOrEnter(
            request.data
          )}${this.utils.printReceived(request.data)}`,
        pass: false,
      };
    }

    return {
      message: () =>
        `${reset}Expected error:${spaceOrEnter(
          message
        )}${this.utils.printExpected(message)}\nReceived error:${spaceOrEnter(
          request.data
        )}${this.utils.printReceived(request.data)}`,
      pass: true,
    };
  }

  if (pass) {
    return {
      message: () =>
        `${reset}Expected ${this.utils.printExpected(
          request.status
        )} to be an error code, received body:\n${this.utils.printExpected(
          request.data
        )}`,
      pass: true,
    };
  }

  return {
    message: () =>
      `${reset}Expected ${this.utils.printReceived(
        request.status
      )} to succeed, received body:\n${this.utils.printReceived(
        request.data,
        null,
        2
      )}`,
    pass: false,
  };
}

expect.extend({ toSucceed });
