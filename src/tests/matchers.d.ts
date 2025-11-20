// Type declarations for custom test matchers
declare global {
  namespace jest {
    interface Matchers<R = void> {
      toSucceed(message?: any): R;
    }
  }
}

// For Bun test runner
declare module "bun:test" {
  interface Matchers {
    toSucceed(message?: any): void;
  }
}

export {};
