function getProvider(): string | null {
  if (typeof (globalThis as any).Netlify !== "undefined") return "netlify";
  // What the Workers runtime reports; there is no global of its own to check
  if ((globalThis as any).navigator?.userAgent === "Cloudflare-Workers") {
    return "cloudflare";
  }
  return null;
}

function getRuntime(): string | null {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof (globalThis as any).Deno !== "undefined") return "deno";
  if ((globalThis as any).process?.versions?.node) return "node";
  return null;
}

function getProduction(): boolean {
  // Can I cry now?
  if (typeof (globalThis as any).Netlify !== "undefined")
    return (globalThis as any).Netlify.env.get("NETLIFY_DEV") !== "true";
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
