// The globals a runtime adds to say who it is. None are in a lib we can rely
// on here, so the shapes this file reads are declared once.
const runtime = globalThis as typeof globalThis & {
  Netlify?: unknown;
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

// Production unless development is explicit, so a forgotten NODE_ENV is safe.
// `env` already holds every platform's variables, Netlify's and Workers' too.
function getProduction(): boolean {
  if (env.NETLIFY_DEV === "true") return false;
  return env.NODE_ENV !== "development" && env.NODE_ENV !== "test";
}

// Once per process, and only when production is the default rather than chosen
let announced = false;
function announceDefault(production: boolean): void {
  if (announced || !production || env.NODE_ENV) return;
  announced = true;
  console.warn(
    "[server:app] Running in production mode. Set NODE_ENV=development " +
      "for local dev.",
  );
}

export default function getMachine(): {
  provider: string | null;
  runtime: string | null;
  production: boolean;
} {
  const production = getProduction();
  announceDefault(production);
  return { provider: getProvider(), runtime: getRuntime(), production };
}
