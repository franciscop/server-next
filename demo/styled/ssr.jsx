import styledBase from "styled-components";

let _sheet = null;

const stylis = (css, selector) => [`${selector}{${css.trim()}}`];
stylis.hash = 0;

const wrap = (StyledComponent) => ({ children, ...props }) => {
  let dynamicClass = "";
  if (_sheet) {
    dynamicClass = StyledComponent.componentStyle.generateAndInjectStyles(props, _sheet, stylis);
  }
  const cls = [StyledComponent.foldedComponentIds, StyledComponent.styledComponentId, dynamicClass, props.className]
    .filter(Boolean).join(" ");
  const forwarded = Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith("$")));
  const Tag = StyledComponent.target;
  return <Tag className={cls} {...forwarded}>{children}</Tag>;
};

export const styled = new Proxy({}, {
  get(_, key) {
    return (strings, ...values) => wrap(styledBase[key](strings, ...values));
  },
});

export const getStyles = (sheet) => {
  _sheet = sheet.instance;
  return ({ children }) => {
    const html = typeof children === "function" ? children() : String(children);
    const styleTags = sheet.getStyleTags();
    sheet.seal();
    _sheet = null;
    return html.replace("</head>", `${styleTags}</head>`);
  };
};
