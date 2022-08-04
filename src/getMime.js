import fs from "node:fs";
import fsp from "node:fs/promises";
import { spawn } from "node:child_process";

// These are some mime types that are not properly produced by
// the file --mime-type command, and can be inferred by their
// filename extension easily
// Note: text/javascript is the recommended now https://stackoverflow.com/a/876805/938236
const extensions = {
  css: "text/css",
  js: "text/javascript",
};

const exists = (file) => {
  return fsp.stat(file, fs.constants.F_OK).then(
    (stat) => stat.isFile(),
    () => false
  );
};

function cmd(...args) {
  const { stdout: stream } = spawn(...args);
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8").trim())
    );
  });
}

export default async function (file) {
  const cwd = await fsp.realpath("./");
  file = await fsp.realpath(file);

  const ext = file.split(".").pop();
  if (extensions[ext]) return extensions[ext];

  // It _is_ a file
  if (!(await exists(file))) return false;
  // Inside the CWD directory
  if (!file.startsWith(cwd)) return false;

  // The two conditions above give us enough confidence to run
  // this, but even then we use spawn() to avoid some nasty injections
  return cmd("file", ["--mime-type", "-b", file]);
}
