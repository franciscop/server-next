const nodeHash = async (message, secret = "") => {
  const crypto = await import("crypto");
  return crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");
};

// From here: https://stackoverflow.com/a/47332317/938236
const browserHash = async (message, secret) => {
  // Encoder to convert string to Uint8Array
  const enc = new TextEncoder("utf-8");

  const key = await window.crypto.subtle.importKey(
    "raw", // raw format of the key - should be Uint8Array
    enc.encode(secret),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false, // export = false
    ["sign", "verify"] // what this key can do
  );
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(message)
  );
  var b = new Uint8Array(signature);
  return Array.prototype.map
    .call(b, x => ("00" + x.toString(16)).slice(-2))
    .join("");
};

// Compare two hashes in constant time
const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  var mismatch = 0;
  for (var i = 0; i < a.length; ++i) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

export const hash = typeof crypto === "undefined" ? nodeHash : browserHash;

export const sign = async (message, secret) => {
  if (!message) throw new TypeError("Provide a message to sign(message)");
  if (!secret) throw new TypeError("Provide a secret to sign(message, secret)");

  const signature = await hash(`${message}${secret}`, secret);
  return `${message}#${signature}`;
};

export const check = async (signed, secret) => {
  // Requires two strings for the check
  if (!signed || typeof signed !== "string") return false;
  if (!secret || typeof secret !== "string") return false;
  if (!signed.includes("#")) return false;

  // Break it into two parts
  const parts = signed.split("#");
  const signature = parts.pop();
  const value = parts.join("#");

  // Get the signature again
  const hashed = await hash(`${value}${secret}`, secret);

  // Compare them in constant time
  return safeEqual(hashed, signature);
};
