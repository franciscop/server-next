const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const encode = (str = "") => str.replace(/[&<>"]/g, (tag) => entities[tag]);

const SELFCLOSE = new Set(
  "area,base,br,col,embed,hr,img,input,link,meta,source,track,wbr".split(","),
);

const altAttrs = {
  classname: "class",
};

export const jsx = (tag, { children, ...props }) => {
  if (typeof tag === "function") return tag({ children, ...props });

  if (props.dangerouslySetInnerHTML)
    children = props.dangerouslySetInnerHTML.__html;
  if (!children) children = [];
  if (typeof children === "string") children = [children];
  children = (Array.isArray(children) ? children : [children])
    .flat()
    .map((c) => (typeof c === "function" ? c() : encode(c)))
    .join("");
  if (!tag) return () => children;
  let attrStr = Object.entries(props || {})
    .filter(([k, v]) => !/on[A-Z]/.test(k) && typeof v !== "function")
    .map(([k, v]) => `${altAttrs[k.toLowerCase()] || encode(k)}="${encode(v)}"`)
    .join(" ");
  if (attrStr) attrStr = " " + attrStr;
  if (SELFCLOSE.has(tag)) return () => `<${tag}${attrStr} />`;
  return () => `<${tag}${attrStr}>${children}</${tag}>`;
};
export const jsxDEV = jsx;
export const Fragment = "";
