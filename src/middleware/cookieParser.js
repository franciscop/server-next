export default ctx => {
  ctx.cookies = {};
  const cookie = ctx.headers.cookie;
  if (!cookie) return;
};
