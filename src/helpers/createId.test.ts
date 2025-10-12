import { describe, expect, it } from "bun:test";
import createId, { random } from "./createId";

describe("createId", () => {
  it("should generate a random ID of default size when no source is provided", () => {
    const id = createId();
    expect(id).toHaveLength(16);
  });

  it("should generate a random ID of specified size", () => {
    const size = 24;
    const id = createId(undefined, size);
    expect(id).toHaveLength(size);
  });

  it("should generate a consistent hash ID based on the source", () => {
    const source = "myUniqueSource";
    const id1 = createId(source);
    const id2 = createId(source);
    expect(id1).toBe(id2);
  });

  it("should generate different IDs for different sources", () => {
    const source1 = "source1";
    const source2 = "source2";
    const id1 = createId(source1);
    const id2 = createId(source2);
    expect(id1).not.toBe(id2);
  });

  it("should use the alphabet characters only", () => {
    const id = createId();
    for (let char of id) {
      expect(
        "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict",
      ).toContain(char);
    }
  });
});

describe("random", () => {
  it("should return a Uint8Array of the specified size", () => {
    const size = 10;
    const array = random(size);
    expect(array).toBeInstanceOf(Uint8Array);
    expect(array).toHaveLength(size);
  });
});
