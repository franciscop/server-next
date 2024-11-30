export default function timer(ctx) {
  const times = [["init", performance.now()]];
  ctx.time = (name) => times.push([name, performance.now()]);
  ctx.time.times = times;
}
