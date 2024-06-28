const urlAlphabet =
  "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";

export let random = (bytes) => crypto.getRandomValues(new Uint8Array(bytes));

export default function createId() {
  let size = 24;
  let id = "";
  let bytes = crypto.getRandomValues(new Uint8Array(size));
  while (size--) {
    // Using the bitwise AND operator to "cap" the value of
    // the random byte from 255 to 63, in that way we can make sure
    // that the value will be a valid index for the "chars" string.
    id += urlAlphabet[bytes[size] & 61];
  }
  return id;
}
