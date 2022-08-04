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
    const buffers = [];
    req.on("data", (chunk) => {
      buffers.push(chunk);
    });
    req.on("end", () => {
      done(Buffer.concat(buffers).toString("binary"));
    });
  });
};

const nanoid = (size = 12) => {
  let str = "";
  while (str.length < size + 2) {
    str += Math.round(Math.random() * 1000000).toString(16);
  }
  return str.slice(0, size);
};

const saveFile = async (name, value, bucket) => {
  const ext = name.split(".").pop();
  const id = `file-${nanoid(12)}.${ext}`;
  await bucket.write(id, value, "binary");
  return id;
};

export default async function Parse(req, contentType, bucket) {
  const rawData = await (typeof req === "string" ? req : getBody(req));
  if (!rawData) return null;

  if (/application\/json/.test(contentType)) {
    return { body: JSON.parse(rawData), files: {} };
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
