const entities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const encode = (str = "") => {
  if (typeof str === "number") str = String(str);
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"]/g, (tag) => entities[tag]);
};

const SELFCLOSE = new Set(
  "area,base,br,col,embed,hr,img,input,link,meta,source,track,wbr".split(","),
);

const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
const REACT_ELEMENT_TYPE = Symbol.for("react.element");

const altAttrs = {
  classname: "class",
};

// valid primitives only
const isValidChild = (child) => child === 0 || child === "" || !!child;

// CSS helpers
const escapeCSS = (value) => String(value).replace(/[<>&"'`]/g, "\\$&");

const minifyCss = (str) =>
  str
    .replace(/\s+/g, " ")
    .replace(/\/\*[^*]*\*\//g, "")
    .trim();

// React element detection (safe for your custom objects too)
const isReactElement = (val) =>
  val !== null && typeof val === "object" && "type" in val && "props" in val;

// 🔥 CRITICAL: single-pass renderer (NO recursion cycles)
const renderChild = (child) => {
  if (child == null || child === false) return "";

  if (Array.isArray(child)) {
    return child.map(renderChild).join("");
  }

  if (typeof child === "function") {
    return renderChild(child());
  }

  if (typeof child === "string") return child;
  if (typeof child === "number") return String(child);

  if (isReactElement(child)) {
    return jsx(child.type, child.props || {})();
  }

  console.warn("Unknown child:", child);
  return "";
};

const jsx = (tag, { children, ...props } = {}) => {
  // 🔥 Fragment (Symbol-safe)
  if (tag === REACT_FRAGMENT_TYPE || tag === Fragment) {
    return () => renderChild(children);
  }

  // function component
  if (typeof tag === "function") {
    return () => renderChild(tag({ children, ...props }));
  }

  // forwardRef-like objects
  if (
    typeof tag === "object" &&
    tag !== null &&
    typeof tag.render === "function"
  ) {
    return () => renderChild(tag.render({ children, ...props }, null));
  }

  // script special-case
  if (tag === "script" && children) {
    const src = children;
    children = () => src;
  }

  // style special-case
  if (tag === "style" && typeof children === "string") {
    const src = minifyCss(escapeCSS(children));
    children = () => src;
  }

  // dangerouslySetInnerHTML
  if (props?.dangerouslySetInnerHTML) {
    children = () => props.dangerouslySetInnerHTML.__html;
  }

  // normalize children
  const flatChildren = (Array.isArray(children) ? children.flat() : [children])
    .filter(isValidChild)
    .map(renderChild)
    .join("");

  // 🔥 CRITICAL SAFETY GATE (prevents Symbol/string crash)
  if (!tag || typeof tag !== "string") {
    return () => flatChildren;
  }

  // attributes
  let attrStr = Object.entries(props || {})
    .filter(([k]) => k !== "dangerouslySetInnerHTML")
    .filter(([k, v]) => !/on[A-Z]/.test(k) && typeof v !== "function")
    .filter(([, v]) => v !== false)
    .map(([k, v]) => {
      const key = altAttrs[k.toLowerCase()] || encode(k);

      if (v === true) return key;

      const value =
        typeof v === "string" || typeof v === "number" ? encode(v) : "";

      return `${key}="${value}"`;
    })
    .join(" ");

  if (attrStr) attrStr = ` ${attrStr}`;

  if (SELFCLOSE.has(tag)) {
    return () => `<${tag}${attrStr} />`;
  }

  const doctype = tag === "html" ? "<!DOCTYPE html>" : "";

  return () => `${doctype}<${tag}${attrStr}>${flatChildren}</${tag}>`;
};

const Fragment = "";

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };
