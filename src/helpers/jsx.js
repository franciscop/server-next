const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const encode = (str = "") => str.replace(/[&<>"]/g, (tag) => entities[tag]);

const SELFCLOSE = new Set(
  "area,base,br,col,embed,hr,img,input,link,meta,source,track,wbr".split(","),
);

export const jsx = (tag, { children, ...props }) => {
  if (typeof tag === "function") return tag({ children, ...props });

  if (SELFCLOSE.has(tag)) return `<${tag} />`;
  if (props.dangerouslySetInnerHTML)
    children = props.dangerouslySetInnerHTML.__html;
  if (!children) children = [];
  if (typeof children === "string") children = [children];
  children = (Array.isArray(children) ? children : [children])
    .map((c) => (typeof c === "function" ? c() : encode(c)))
    .join("");
  if (!tag) return () => children;
  const attrStr = Object.entries(props || {})
    .filter(([k, v]) => !/on[A-Z]/.test(k) && typeof v !== "function")
    .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
    .join(" ");
  return () => `<${tag} ${attrStr}>${children}</${tag}>`;
};
export const jsxDEV = jsx;
export const Fragment = "";
