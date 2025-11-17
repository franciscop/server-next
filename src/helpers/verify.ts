import { timingSafeEqual } from "node:crypto";
import * as crypto from "node:crypto";

export default async function verify(
  password: string,
  hash: string,
): Promise<boolean> {
  if ("Bun" in globalThis) {
    return Bun.password.verify(password, hash);
  }

  // Example format:
  // $argon2id$v=19$m=65536,t=3,p=1$<base64salt>$<base64hash>
  const match =
    /^\$argon2(id|i|d)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(
      hash,
    );
  if (!match) throw new Error("Invalid Argon2 hash format");

  const [, variant, , memory, passes, parallelism, saltB64, hashB64] = match;

  const nonce = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  return new Promise((resolve, reject) => {
    crypto.argon2(
      `argon2${variant as "i" | "d" | "id"}`,
      {
        message: password,
        nonce,
        memory: parseInt(memory, 10),
        passes: parseInt(passes, 10),
        parallelism: parseInt(parallelism, 10),
        tagLength: expected.length,
      },
      (err, derivedKey) => {
        if (err) return reject(err);

        if (
          derivedKey.length === expected.length &&
          timingSafeEqual(derivedKey, expected)
        ) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
    );
  });
}
