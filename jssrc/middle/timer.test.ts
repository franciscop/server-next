import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import timer, { createTime } from "./timer";
import { Context } from "../types";

let globalPerfNow = performance.now;
describe("timer", () => {
  beforeEach(() => {
    performance.now = () => 1000;
  });

  afterEach(() => {
    performance.now = globalPerfNow;
  });

  test("attaches to the context with the right signature", () => {
    const ctx: Partial<Context> = {};
    timer(ctx);
    expect(ctx.time).toBeDefined();
    expect(typeof ctx.time).toBe("function");
    expect(ctx.time.times[0]).toEqual(["init", 1000]);
    expect(typeof ctx.time.headers).toBe("function");
  });
});

describe("createTime", () => {
  beforeEach(() => {
    performance.now = () => 1000;
  });

  afterEach(() => {
    performance.now = globalPerfNow;
  });

  test("should initialize times array with init timestamp", () => {
    const time = createTime();
    expect(time.times).toEqual([["init", 1000]]);
  });

  test("should add new time entry", () => {
    const time = createTime();
    performance.now = () => 1500;
    time("event1");
    expect(time.times).toEqual([
      ["init", 1000],
      ["event1", 1500],
    ]);
  });

  test("should generate timing headers", () => {
    const time = createTime();
    let callCount = 0;
    performance.now = () => {
      callCount++;
      return callCount === 1 ? 1500 : 2000;
    };
    time("event1");
    time("event2");
    const headers = time.headers();
    expect(headers).toBe("event1;dur=500, event2;dur=500");
  });

  test("should round durations in headers", () => {
    const time = createTime();
    let callCount = 0;
    performance.now = () => {
      callCount++;
      return callCount === 1 ? 1500.678 : 2000.123;
    };
    time("event1");
    time("event2");
    const headers = time.headers();
    expect(headers).toBe("event1;dur=501, event2;dur=499");
  });
});
