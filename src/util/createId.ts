const alphabet =
  "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

const random = (bytes: number): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(bytes));

// A random, URL-safe id (file names, OAuth state, fallback secrets)
export default function createId(size: number = 16): string {
  let id = "";
  const bytes = random(size);
  while (size--) {
    id += alphabet[bytes[size] & 61];
  }
  return id;
}
