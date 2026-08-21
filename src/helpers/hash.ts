// Hash in either Node.js or Bun. Use argon2id and similar params, should
// be compatible among each other
import * as crypto from "node:crypto";
import { getRandomValues } from "node:crypto";
import { promisify } from "node:util";

export default async function hash(password: string): Promise<string> {
  // Fork on the runtime, like verify() does: Bun 1.4 exposes a `crypto.argon2`
  // that throws when called, so checking for the function picks the wrong one.
  if ("Bun" in globalThis) {
    return await Bun.password.hash(password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });
  }

  if (!("argon2" in crypto)) {
    throw new Error(
      "Password hashing needs argon2: run on Bun, or on Node 24+ where " +
        "node:crypto provides it.",
    );
  }

  // Same parameters Bun.password uses, so hashes are alike in both runtimes
  const nonce = getRandomValues(new Uint8Array(32));
  const argon2 = promisify(crypto.argon2);
  const buf = await argon2("argon2id", {
    message: Buffer.from(password),
    nonce,
    parallelism: 1,
    tagLength: 32,
    memory: 65536,
    passes: 3,
  });

  // The salt and parameters belong in the output: verify() needs them to
  // recompute the hash, so a bare digest could never be checked again.
  const b64 = (bytes: Uint8Array) =>
    Buffer.from(bytes).toString("base64").replace(/=+$/, "");
  return `$argon2id$v=19$m=65536,t=3,p=1$${b64(nonce)}$${b64(buf)}`;
}
