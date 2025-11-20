const entities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

const encode = (str = "") => {
  if (typeof str === "number") str = String(str);
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"]/g, (tag) => entities[tag]);
};

const SELFCLOSE = new Set(
  "area,base,br,col,embed,hr,img,input,link,meta,source,track,wbr".split(","),
);

const altAttrs = {
  classname: "class",
};

// "" and 0 are valid children, false and null and undefined are not
const isValidChild = (child) => child || child === "" || child === 0;

const escapeCSS = (value) => String(value).replace(/[<>&"'`]/g, "\\$&");

const minifyCss = (str) =>
  str
    .replace(/\s+/g, " ")
    .replace(/(?!<")\/\*[^*]+\*\/(?!")/g, "")
    .replace(/(\w|\*) (\{)/g, "$1$2")
    .replace(/(\}) (\w|\*)/g, "$1$2")
    .replace(/(\{) (\w)/g, "$1$2")
    .replace(/(\w)(:) /g, "$1$2")
    .replace(/(;) (\})/g, "$1$2")
    .replace(/(;) (\w)/g, "$1$2")
    .replace(/;(\})/g, "$1")
    .replace(/(\w), (\w)/g, "$1,$2")
    .replace(/(\w), (\w)/g, "$1,$2")
    .replace(/(\{) (\w)/g, "$1$2")
    .trim();

const jsx = (tag, { children, ...props } = {}) => {
  if (typeof tag === "function") return tag({ children, ...props });

  if (tag === "script" && children) {
    const src = children;
    children = () => src;
  }

  if (tag === "style" && children && typeof children === "string") {
    const src = minifyCss(escapeCSS(children));
    children = () => src;
  }

  if (props?.dangerouslySetInnerHTML) {
    children = () => props.dangerouslySetInnerHTML.__html;
  }

  if (!isValidChild(children)) children = [];
  if (typeof children === "string") children = [children];

  children = (Array.isArray(children) ? children : [children])
    .flat()
    .map((c) => (typeof c === "function" ? c() : encode(c)))
    .join("");

  if (!tag) return () => children;

  let attrStr = Object.entries(props || {})
    .filter(([k]) => k !== "dangerouslySetInnerHTML")
    .filter(([k, v]) => !/on[A-Z]/.test(k) && typeof v !== "function")
    .filter(([, v]) => v !== false)
    .map(([k, v]) =>
      v === true
        ? altAttrs[k.toLowerCase()] || encode(k)
        : `${altAttrs[k.toLowerCase()] || encode(k)}="${encode(String(v))}"`,
    )
    .join(" ");

  if (attrStr) attrStr = ` ${attrStr}`;

  if (SELFCLOSE.has(tag)) return () => `<${tag}${attrStr} />`;

  const doctype = tag === "html" ? "<!DOCTYPE html>" : "";
  return () => `${doctype}<${tag}${attrStr}>${children}</${tag}>`;
};

export const jsxs = jsx;
export const jsxDEV = jsx;
export const Fragment = "";
