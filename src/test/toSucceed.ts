import { expect } from "@jest/globals";

const reset = "\x1b[0m";

const spaceOrEnter = (msg: any): string => {
  if (typeof msg === "string") {
    return " ";
  }
  return "\n";
};

interface MatcherContext {
  utils: {
    printExpected: (value: any) => string;
    printReceived: (value: any, indent?: any, depth?: number) => string;
  };
}

interface Request {
  status: number;
  body: any;
}

export default function toSucceed(this: MatcherContext, request: Request, message?: any) {
  const pass = request.status >= 200 && request.status < 400;

  if (message && JSON.stringify(request.body) !== JSON.stringify(message)) {
    if (pass) {
      return {
        message: () =>
          `${reset}Expected body:${spaceOrEnter(
            message,
          )}${this.utils.printExpected(message)}\nReceived body:${spaceOrEnter(
            request.body,
          )}${this.utils.printReceived(request.body)}`,
        pass,
      };
    }

    return {
      message: () =>
        `${reset}Expected error:${spaceOrEnter(
          message,
        )}${this.utils.printExpected(message)}\nReceived error:${spaceOrEnter(
          request.body,
        )}${this.utils.printReceived(request.body)}`,
      pass: !pass,
    };
  }

  if (pass) {
    return {
      message: () =>
        `${reset}Expected ${this.utils.printExpected(
          request.status,
        )} to be an error code, received body:\n${this.utils.printExpected(
          request.body,
        )}`,
      pass: true,
    };
  }

  return {
    message: () =>
      `${reset}Expected ${this.utils.printReceived(
        request.status,
      )} to succeed, received body:\n${this.utils.printReceived(
        request.body,
        null,
        2,
      )}`,
    pass: false,
  };
}

expect.extend({ toSucceed });
