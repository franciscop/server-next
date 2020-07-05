const { abs, exists, read, walk } = require("files");
const slugify = require("@sindresorhus/slugify");

const parseToc = async (src) => {
  const toc = [];
  const headers = JSON.parse(await read(abs("menu.json", src)));
  for (let key in headers) {
    const name = headers[key];
    const folder = name.includes("/") ? name.split("/").shift() : "";
    const base = `/documentation/${folder}`;
    const readme = await read(abs(name, src));
    const sections = readme.match(/^\#\#[\s](.+)/gm) || [];
    toc.push({
      link: base,
      title: key,
      sections: sections
        .map((one) => one.replace(/^\#\#\s/, ""))
        .map((title) => ({ title, link: `${base}#${slugify(title)}` })),
    });
  }
  return toc;
};

module.exports = async () => {
  return {
    docs: await parseToc("./documentation/"),
  };
};
