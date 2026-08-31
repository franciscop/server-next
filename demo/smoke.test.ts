import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Demos are not covered by the suite in `src`, so they rot quietly: an option
// gets renamed, a demo keeps referring to the old one, and nobody notices until
// someone opens it. This boots every demo and asks it for a page.
//
// Under Bun nothing binds a port (Bun serves the exported app itself), so
// importing a demo is side-effect free.

const ENTRIES = ["index.js", "index.jsx", "index.ts", "index.tsx", "src/index.tsx", "src/index.ts"];

// A demo with a login flow needs its provider credentials to boot, the same as
// the .env its readme tells you to write. Placeholders are enough: this suite
// only asks each demo for a page, and never completes a handshake. Set on
// `process.env` (the framework snapshots it into `env` when a demo imports it)
// and on `env` itself, in case another file loaded the framework first.
const CREDENTIALS = { GITHUB_ID: "smoke-id", GITHUB_SECRET: "smoke-secret" };
for (const [key, value] of Object.entries(CREDENTIALS)) {
  process.env[key] ??= value;
  if (typeof globalThis.env === "object") globalThis.env[key] ??= value;
}

// Each skip needs a reason. Without one, a demo that quietly stops exporting an
// app would drop out of this suite instead of failing it.
const SKIP: Record<string, string> = {
  "auth-better-auth": "commented out on purpose: no third-party auth mode yet",
  // Its `db` is a module singleton bound at import, so booting it here would
  // pin the real file before its own tests can point DB_FILE at :memory:
  "user-management": "covered by its own tests in src/index.test.ts",
};

const demos = readdirSync("demo")
  .filter((name) => statSync(`demo/${name}`).isDirectory())
  .sort();

describe("demos still run", () => {
  it("finds every demo, so none silently drops out", () => {
    expect(demos.length).toBeGreaterThan(25);
  });

  for (const name of demos) {
    const reason = SKIP[name];
    it.skipIf(Boolean(reason))(`${name} answers a request`, async () => {
      const dir = `demo/${name}`;
      const entry = ENTRIES.map((f) => `${dir}/${f}`).find((f) => existsSync(f));
      expect(entry, `${dir} has no entry file`).toBeTruthy();

      // Demos read their own assets by relative path (`./views`, `./public`),
      // so they run from their own folder the way `bun .` would run them.
      const cwd = process.cwd();
      let app: any;
      try {
        process.chdir(dir);
        app = (await import(resolve(cwd, entry as string))).default;
      } catch (error) {
        // A demo with its own dependencies only runs after an `npm install`
        // inside it, which a fresh checkout has not done. Anything else that
        // throws on import is the demo being broken, and fails.
        if (!/Cannot find (module|package)/.test(String((error as Error).message))) {
          throw error;
        }
        console.log(`  skipped ${name}: its own dependencies are not installed`);
        return;
      } finally {
        process.chdir(cwd);
      }

      expect(app?.fetch, `${entry} has no server as its default export`).toBeFunction();
      const res = await app.fetch(new Request("http://localhost/"));
      expect(res).toBeInstanceOf(Response);
      // A 404 is fine (plenty of demos have no "/"), a crash is not
      expect(res.status, `GET / crashed`).toBeLessThan(500);

      const body = await res.text();
      // The rot that started this: a component returning a string gets escaped,
      // so the whole page ships as text
      expect(body.startsWith("&lt;")).toBe(false);
    });
  }
});
