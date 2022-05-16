import reduce from "./reduce";

const fnA = (num) => num + 1;
const fnB = (num) => null;
const fnC = (num) => {
  throw new Error("Bla");
};

describe("helpers/reduce", () => {
  it("works as expected", async () => {
    const handler = reduce(fnA, fnB, fnC);
    expect(typeof handler).toBe("function");
    expect(await handler(0)).toBe(1);
  });

  it("can skip and throw", async () => {
    const handler = reduce(fnB, fnC);
    expect(await handler()).toEqual(new Error("Bla"));
  });
});
