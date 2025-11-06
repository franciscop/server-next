"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createCookies;
// Takes an object and returns a string with the proper cookie values
function createCookies(cookies) {
    if (!cookies || !Object.keys(cookies).length)
        return [];
    return Object.entries(cookies).map(function (_a) {
        var key = _a[0], val = _a[1];
        if (!val) {
            val = { value: "", expires: new Date(0).toUTCString() };
        }
        if (typeof val === "string") {
            val = { value: val };
        }
        var value = val.value, path = val.path, expires = val.expires;
        var pathPart = ";Path=".concat(path || "/");
        var expiresPart = expires ? ";Expires=".concat(expires) : "";
        return "".concat(key, "=").concat(value || "").concat(pathPart).concat(expiresPart);
    });
}
