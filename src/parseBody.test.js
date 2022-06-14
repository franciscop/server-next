import parseBody from "./parseBody.js";

const getBody = () => {
  let body = "trash1\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n";
  body += 'Content-Disposition: form-data; name="hello";\r\n\r\n';
  body += "world\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n";
  body +=
    'Content-Disposition: form-data; name="profile"; filename="profile.md"\r\n';
  body += "Content-Type: text/plain\r\n\r\n";
  body += "@11X";
  body += "111Y\r\n";
  body += "111Z\rCCCC\nCCCC\r\nCCCCC@\r\n\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n";
  body +=
    'Content-Disposition: form-data; name="gallery[]"; filename="A.txt"\r\n';
  body += "Content-Type: text/plain\r\n\r\n";
  body += "@11X";
  body += "111Y\r\n";
  body += "111Z\rCCCC\nCCCC\r\nCCCCC@\r\n\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n";
  body += 'Content-Disposition: form-data; name="test";\r\n\r\n';
  body += "test message 123456\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n";
  body += 'Content-Disposition: form-data; name="test";\r\n\r\n';
  body += "test message number two\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n";
  body +=
    'Content-Disposition: form-data; name="gallery[]"; filename="C.txt"\r\n';
  body += "Content-Type: text/plain\r\n\r\n";
  body += "@CCC";
  body += "CCCY\r\n";
  body += "CCCZ\rCCCW\nCCC0\r\n666@\r\n";
  body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp--\r\n";
  return body;
};

describe("parseBody", () => {
  it("can parse the example body", async () => {
    const parsed = await parseBody(
      getBody(),
      "multipart/form-data; boundary=----WebKitFormBoundaryvef1fLxmoUdYZWXp"
    );
    expect(parsed.body).toEqual({
      hello: "world",
      test: ["test message 123456", "test message number two"],
    });
    expect(parsed.files).toEqual({
      profile: {
        name: "profile.md",
        type: "text/plain",
        value: "@11X111Y\r\n111Z\rCCCC\nCCCC\r\nCCCCC@\r\n",
      },
      gallery: [
        {
          name: "A.txt",
          type: "text/plain",
          value: "@11X111Y\r\n111Z\rCCCC\nCCCC\r\nCCCCC@\r\n",
        },
        {
          name: "C.txt",
          type: "text/plain",
          value: "@CCCCCCY\r\nCCCZ\rCCCW\nCCC0\r\n666@",
        },
      ],
    });
  });
});
