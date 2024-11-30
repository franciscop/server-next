export default function timer(ctx) {
  const times = [["init", performance.now()]];
  ctx.time = (name) => times.push([name, performance.now()]);
  ctx.time.times = times;
  ctx.time.headers = () => {
    const r = (t) => Math.round(t);
    const times = ctx.time.times;
    const timing = times
      .slice(1)
      .map(([name, time], i) => `${name};dur=${r(time - times[i][1])}`)
      .join(", ");
    return timing;
  };
}
