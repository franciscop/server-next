import createId from "../../src/helpers/createId";

const tag = (strings, values, props) => {
  let str = strings[0];
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] === "function") {
      str += values[i](props) + strings[i + 1];
    } else {
      str += values[i] + strings[i + 1];
    }
  }
  return str;
};

const staticGenerator = (Key, str) => {
  const name = "s" + createId(str, 6);
  const style = `.${name} {${str}}`;
  return ({ className, ...props }) => {
    const fullClass = name + (className ? " " + className : "");
    return (
      <>
        <style>{style}</style>
        <Key className={fullClass} {...props} />
      </>
    );
  };
};

const dynamicGenerator = (Key, str, values) => {
  return ({ className, ...props }) => {
    const content = tag(str, values, props);
    const name = "s" + createId(content, 6);
    const style = `.${name} {${content}}`;
    const fullClass = name + (className ? " " + className : "");
    return (
      <>
        <style>{style}</style>
        <Key className={fullClass} {...props} />
      </>
    );
  };
};

const getter = (_, Key) => {
  return (str, ...values) => {
    if (str.length === 1) return staticGenerator(Key, str[0]);
    return dynamicGenerator(Key, str, values);
  };
};

export default new Proxy({}, { get: getter });
