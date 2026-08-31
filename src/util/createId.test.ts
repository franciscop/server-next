import { describe, expect, it } from "bun:test";
import createId from "./createId";

describe("createId", () => {
  it("generates a random ID of the default size", () => {
    const id = createId();
    expect(id).toHaveLength(16);
  });

  it("generates a random ID of the specified size", () => {
    const size = 24;
    const id = createId(size);
    expect(id).toHaveLength(size);
  });

  it("generates different IDs on every call", () => {
    expect(createId()).not.toBe(createId());
  });

  it("uses the alphabet characters only", () => {
    const id = createId();
    for (const char of id) {
      expect(
        "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict",
      ).toContain(char);
    }
  });
});
