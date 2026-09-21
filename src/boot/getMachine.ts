// The globals a runtime adds to say who it is. None are in a lib we can rely
// on here, so the shapes this file reads are declared once.
const runtime = globalThis as typeof globalThis & {
  Netlify?: { env: { get(name: string): string | undefined } };
  Deno?: unknown;
  navigator?: { userAgent?: string };
  process?: { versions?: { node?: string } };
};

function getProvider(): string | null {
  if (typeof runtime.Netlify !== "undefined") return "netlify";
  // What the Workers runtime reports; there is no global of its own to check
  if (runtime.navigator?.userAgent === "Cloudflare-Workers")
    return "cloudflare";
  return null;
}

function getRuntime(): string | null {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof runtime.Deno !== "undefined") return "deno";
  if (runtime.process?.versions?.node) return "node";
  return null;
}

function getProduction(): boolean {
  // Can I cry now?
  if (runtime.Netlify) return runtime.Netlify.env.get("NETLIFY_DEV") !== "true";
  return process.env.NODE_ENV === "production";
}

export default function getMachine(): {
  provider: string | null;
  runtime: string | null;
  production: boolean;
} {
  return {
    provider: getProvider(),
    runtime: getRuntime(),
    production: getProduction(),
  };
}
