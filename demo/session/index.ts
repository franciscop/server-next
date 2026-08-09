import kv from "polystore";
import server from "../..";

type Session = { counter?: number };
const sessions = kv<Session>(`file://${process.cwd()}/store/`);

export default server<{ session: Session }>({ sessions }).get("/", (ctx) => {
  ctx.session.counter ??= 0;
  ctx.session.counter++;
  return `Visited ${ctx.session.counter} times`;
});
