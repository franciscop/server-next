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
  return str.replace(/[&<>"']/g, (tag) => entities[tag]);
};

const SELFCLOSE = new Set(
  "area,base,br,col,embed,hr,img,input,link,meta,source,track,wbr".split(","),
);

const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");

const altAttrs = {
  classname: "class",
  htmlfor: "for",
};

// valid primitives only — null, undefined, false, true are all skipped
const isValidChild = (child) =>
  child != null && child !== false && child !== true;

const minifyCss = (str) =>
  str
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>~+])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/<\/style>/gi, "<\\/style>")
    .trim();

// React element detection (safe for custom objects too)
const isReactElement = (val) =>
  val !== null && typeof val === "object" && "type" in val && "props" in val;

// Marker for raw (pre-escaped) content that bypasses HTML encoding
const RAW = Symbol("raw");
const raw = (str) => ({ [RAW]: String(str) });

const renderChild = (child) => {
  if (child == null || child === false || child === true) return "";

  if (Array.isArray(child)) {
    return child.map(renderChild).join("");
  }

  if (typeof child === "function") {
    const result = child();
    // Strings returned by functions are pre-rendered HTML — don't re-encode them
    if (result == null || result === false || result === true) return "";
    if (typeof result === "string") return result;
    if (typeof result === "number") return String(result);
    return renderChild(result);
  }

  if (typeof child === "string") return encode(child);
  if (typeof child === "number") return String(child);

  // Raw marker bypasses encoding (used by script, style, dangerouslySetInnerHTML)
  if (typeof child === "object" && RAW in child) return child[RAW];

  if (isReactElement(child)) {
    return jsx(child.type, child.props || {})();
  }

  console.warn("Unknown child:", child);
  return "";
};

const jsx = (tag, { children, ...props } = {}) => {
  // Fragment (Symbol-safe)
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

  // script: raw content (JS must not be HTML-encoded)
  if (tag === "script" && children != null) {
    const parts = Array.isArray(children) ? children : [children];
    const content = parts
      .filter(isValidChild)
      .map((c) => (typeof c === "string" ? c : typeof c === "number" ? String(c) : ""))
      .join("");
    children = raw(content);
  }

  // style: minified raw content
  if (tag === "style" && typeof children === "string") {
    children = raw(minifyCss(children));
  }

  // dangerouslySetInnerHTML
  if (props?.dangerouslySetInnerHTML) {
    children = raw(props.dangerouslySetInnerHTML.__html ?? "");
  }

  // normalize children
  const flatChildren = (Array.isArray(children) ? children.flat() : [children])
    .filter(isValidChild)
    .map(renderChild)
    .join("");

  // safety gate (prevents Symbol/unknown-type crash)
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
        typeof v === "string" || typeof v === "number" ? encode(String(v)) : "";

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

const Fragment = Symbol.for("react.fragment");

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };
