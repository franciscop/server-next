import type { Options } from "../types";
import createId from "./createId";

// Normalize the `secrets` option (or the SECRETS env var) into the list of keys
// this server signs and verifies with. The first one signs; all of them verify.
//
// That is what makes rotating a key different from a mass logout: put the new
// key first, deploy, and everything already signed with the old one keeps
// working. Drop the old key once a full token lifetime has passed.
//
// The env var is comma-separated, so a secret cannot contain a comma. Every way
// of generating one is comma-free (base64, base64url, hex, uuid), which is why
// this is a safe split, but a hand-written passphrase must avoid it.
//
// With nothing set at all, a random per-process key is generated so development
// needs no configuration; `config` warns when that reaches production.
export function resolveSecrets(option: Options["secrets"]): string[] {
  const given = option ?? globalThis.env.SECRETS?.split(",");
  const list = (Array.isArray(given) ? given : [given])
    .map((one) => one?.trim())
    .filter(Boolean);
  return list.length ? (list as string[]) : [`unsafe-${createId()}`];
}
