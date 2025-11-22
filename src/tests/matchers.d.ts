// Type declarations for custom test matchers
declare global {
  namespace jest {
    interface Matchers<R = void> {
      toSucceed(message?: string): R;
    }
  }
}

// For Bun test runner
declare module "bun:test" {
  interface Matchers {
    toSucceed(message?: string): void;
  }
}

export {};
