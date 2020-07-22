const { abs, exists, read, walk } = require("files");
const slugify = require("@sindresorhus/slugify");

const parseToc = async (src) => {
  const toc = [];
  const headers = JSON.parse(await read(abs("menu.json", src)));
  for (let title in headers) {
    const name = headers[title];
    const folder = name.includes("/") ? name.split("/").shift() : "";
    const link = `/documentation/${folder}/`.replace(/\/\/$/, "/");
    const readme = await read(abs(name, src));
    const sections = readme.match(/^\#\#[\s](.+)/gm) || [];
    toc.push({
      link,
      title: title,
      sections: sections
        .map((one) => one.replace(/^\#\#\s/, ""))
        .map((title) => ({ title, link: `${link}#${slugify(title)}` })),
    });
  }
  return toc;
};

module.exports = async () => {
  return {
    docs: await parseToc("./documentation/"),
  };
};
