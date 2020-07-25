const { abs, exists, read, walk } = require("files");
const slugify = require("@sindresorhus/slugify");

const videos = [
  {
    title: "Screencasts",
    link: "434253548",
    sections: [
      { title: "Installing server.js", link: "434253548" },
      { title: "Rendering a page", link: "434970483" },
      { title: "Simple router", link: "434970506" },
      { title: "Submit a form", link: "434970532" },
      { title: "Receive files", link: "432360866" },
      { title: "Use middleware", link: "355789315" },
      { title: "Environment vars", link: "431523139" },
    ],
  },
  {
    title: "HTTP Router",
    link: "431523139",
    sections: [
      { title: "All HTTP methods", link: "431523139" },
      { title: "URL Queries", link: "432360866" },
      { title: "URL Parameters", link: "355789315" },
      { title: "Combine routers", link: "431523139" },
      { title: "Middleware for a route", link: "432360866" },
      { title: "Advanced parameters", link: "355789315" },
    ],
  },
  {
    title: "Websockets",
    link: "355789315",
    sections: [
      { title: "Connecting the front-end", link: "355789315" },
      { title: "Sending messages", link: "431523139" },
      { title: "Using channels", link: "432360866" },
      { title: "Middleware for a router", link: "355789315" },
      { title: "Advanced parameters", link: "431523139" },
    ],
  },
  {
    title: "Configuration",
    link: "432360866",
    sections: [
      { title: "Enable CORS", link: "432360866" },
      { title: "Managing files", link: "355789315" },
      { title: "Data validation", link: "431523139" },
      { title: "", link: "432360866" },
      { title: "", link: "355789315" },
      { title: "", link: "431523139" },
    ],
  },
];

const parseToc = async (src) => {
  const toc = [];
  const headers = JSON.parse(await read(abs("menu.json", src)));
  for (let title in headers) {
    const name = headers[title];
    const folder = name.includes("/") ? name.split("/").shift() : "";
    const link = `/${src.replace(/\W+/g, "")}/${folder}/`.replace(/\/\/$/, "/");
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
    videos,
    docs: await parseToc("./documentation/"),
    tuts: await parseToc("./tutorials/"),
  };
};
