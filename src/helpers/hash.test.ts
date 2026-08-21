import { execFileSync } from "node:child_process";
import hash from "./hash";
import verify from "./verify";

describe("password hashing", () => {
  it("round-trips a password", async () => {
    const stored = await hash("correct horse battery staple");
    expect(await verify("correct horse battery staple", stored)).toBe(true);
    expect(await verify("wrong", stored)).toBe(false);
  });

  // Both helpers fork on the runtime, so `bun test` only ever exercises the
  // Bun half. Run the Node half in a subprocess to cover the other branch.
  //
  // Expected to FAIL: under Node, hash() returns the bare base64 of the
  // derived key (no salt, no parameters) while verify() expects the PHC
  // string `$argon2id$v=19$m=...$salt$hash`, so nothing it writes can ever be
  // verified. The `email` provider is the only consumer, so email+password
  // logins are broken on Node today.
  it("round-trips a password under Node too", () => {
    const script = `
      const { pathToFileURL } = require("node:url");
      const dir = pathToFileURL(process.argv[1]).href;
      (async () => {
        const { default: hash } = await import(dir + "/hash.ts");
        const { default: verify } = await import(dir + "/verify.ts");
        const stored = await hash("secret123");
        console.log(await verify("secret123", stored));
      })().catch((error) => {
        console.log("threw: " + error.message);
      });
    `;
    const out = execFileSync("node", ["-e", script, import.meta.dir], {
      encoding: "utf8",
    }).trim();
    expect(out).toBe("true");
  });
});
