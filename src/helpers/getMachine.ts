function getProvider(): string | null {
  if (typeof Netlify !== "undefined") return "netlify";
  return null;
}

function getRuntime(): string | null {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof Deno !== "undefined") return "deno";
  if ((globalThis as any).process?.versions?.node) return "node";
  return null;
}

function getProduction(): boolean {
  // Can I cry now?
  if (typeof Netlify !== "undefined")
    return (Netlify as any).env.get("NETLIFY_DEV") !== "true";
  return process.env.NODE_ENV === "production";
}

export default function getMachine(): { provider: string | null; runtime: string | null; production: boolean } {
  return {
    provider: getProvider(),
    runtime: getRuntime(),
    production: getProduction(),
  };
}
