// Hash in either Node.js or Bun. Use argon2id and similar params, should
// be compatible among each other
import * as crypto from "node:crypto";
import { getRandomValues } from "node:crypto";
import { promisify } from "node:util";

export default async function hash(password: string): Promise<string> {
  if ("argon2" in crypto) {
    const argon2 = promisify(crypto.argon2);
    const buf = await argon2("argon2id", {
      message: Buffer.from(password),
      nonce: getRandomValues(new Uint8Array(16)),
      parallelism: 4,
      tagLength: 64,
      memory: 65536,
      passes: 3,
    });
    return buf.toString("base64");
  }
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}
