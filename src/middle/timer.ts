import { Context } from "../types";

export const createTime = () => {
  const times: [string, number][] = [["init", performance.now()]];
  const time = (name: string) => times.push([name, performance.now()]);
  time.times = times;
  time.headers = () => {
    const r = (t: number) => Math.round(t);
    const times = time.times;
    const timing = times
      .slice(1)
      .map(([name, time], i) => `${name};dur=${r(time - times[i][1])}`)
      .join(", ");
    return timing;
  };
  return time;
};

export default function timer(ctx: Partial<Context>): void {
  (ctx as any).time = createTime();
}
