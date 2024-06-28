import { createId } from "../helpers/index.js";

function getBoundary(header) {
  if (!header) return null;
  var items = header.split(";");
  if (items)
    for (var j = 0; j < items.length; j++) {
      var item = new String(items[j]).trim();
      if (item.indexOf("boundary") >= 0) {
        var k = item.split("=");
        return new String(k[1]).trim();
      }
    }
  return null;
}

function getMatching(string, regex) {
  // Helper function when using non-matching groups
  const matches = string.match(regex);
  if (!matches || matches.length < 2) {
    return "";
  }
  return matches[1];
}

const saveFile = async (name, value, bucket) => {
  const ext = name.split(".").pop();
  const id = `${createId()}.${ext}`;
  await bucket.write(id, value, "binary");
  return id;
};

export default async function parseBody(raw, contentType, bucket) {
  const rawData = typeof raw === "string" ? raw : await raw.text();
  if (!rawData) return {};

  if (!contentType || /text\/plain/.test(contentType)) {
    return rawData;
  }

  if (/application\/json/.test(contentType)) {
    return JSON.parse(rawData);
  }

  const boundary = getBoundary(contentType);
  if (!boundary) return null;

  const body = {};

  const rawDataArray = rawData.split(boundary);
  for (let item of rawDataArray) {
    // Use non-matching groups to exclude part of the result
    const name = getMatching(item, /(?:name=")(.+?)(?:")/)
      .trim()
      .replace(/\[\]$/, "");
    if (!name) continue;

    let value = getMatching(item, /(?:\r\n\r\n)([\S\s]*)(?:\r\n--$)/);
    if (!value) continue;

    // Check whether we have a filename. If we do, assign it to the value
    const filename = getMatching(item, /(?:filename=")(.*?)(?:")/).trim();
    if (filename) {
      value = await saveFile(filename, value, bucket);
    }

    // Save the key-value, accounting for possibly repeated keys
    if (body[name]) {
      if (!Array.isArray(body[name])) {
        body[name] = [body[name]];
      }
      body[name].push(value);
    } else {
      body[name] = value;
    }
  }

  return body;
}
