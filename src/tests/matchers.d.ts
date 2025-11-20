// Type declarations for custom test matchers

interface Request {
  status: number;
  body: any;
}

declare global {
  namespace jest {
    interface Matchers<R = void> {
      toSucceed(message?: any): R;
    }
  }
}

// For Bun test runner
declare module "bun:test" {
  interface Matchers<T = unknown> {
    toSucceed(message?: any): void;
  }
}

export {};
