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

const getBody = async (req) => {
  return await new Promise((done) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      done(data);
    });
  });
};

export default async function Parse(req, contentType) {
  const rawData = await (typeof req === "string" ? req : getBody(req));
  if (!rawData) return null;

  if (/application\/json/.test(contentType)) {
    return { body: JSON.parse(rawData), files: {} };
  }

  const boundary = getBoundary(contentType);
  if (!boundary) return null;

  let result = {};

  const body = {};
  const files = {};

  const rawDataArray = rawData.split(boundary);
  for (let item of rawDataArray) {
    // Use non-matching groups to exclude part of the result
    const name = getMatching(item, /(?:name=")(.+?)(?:")/)
      .trim()
      .replace(/\[\]$/, "");
    if (!name) continue;
    const value = getMatching(item, /(?:\r\n\r\n)([\S\s]*)(?:\r\n--$)/);
    if (!value) continue;

    const filename = getMatching(item, /(?:filename=")(.*?)(?:")/).trim();
    // It's a file!
    if (filename) {
      const file = { name: filename };
      const type = getMatching(item, /(?:Content-Type:)(.*?)(?:\r\n)/).trim();
      if (type) {
        file.type = type;
      }
      file.value = value;

      // Already exists, so (maybe convert to an array) and push the item in it
      if (files[name]) {
        if (!Array.isArray(files.name)) {
          files[name] = [files[name]];
        }
        files[name].push(file);
      } else {
        files[name] = file;
      }

      // It's a body
    } else {
      if (body[name]) {
        if (!Array.isArray(body[name])) {
          body[name] = [body[name]];
        }
        body[name].push(value);
      } else {
        body[name] = value;
      }
    }
  }

  return { body, files };
}
