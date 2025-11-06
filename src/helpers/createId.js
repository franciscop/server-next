"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = void 0;
exports.default = createId;
var alphabet = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";
var random = function (bytes) {
    return crypto.getRandomValues(new Uint8Array(bytes));
};
exports.random = random;
// Credit: https://stackoverflow.com/a/52171480/938236
var cyrb53 = function (str, seed) {
    if (seed === void 0) { seed = 0; }
    if (typeof str !== "string")
        str = String(str);
    var h1 = 0xdeadbeef ^ seed;
    var h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch = void 0; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
var hash = function (str, size) {
    var chars = "";
    var num = cyrb53(str);
    for (var i = 0; i < size; i++) {
        if (num < alphabet.length)
            num = cyrb53(str, i);
        chars += alphabet[num % alphabet.length];
        num = Math.floor(num / alphabet.length);
    }
    return chars;
};
var randomId = function (size) {
    if (size === void 0) { size = 16; }
    var id = "";
    var bytes = (0, exports.random)(size);
    while (size--) {
        id += alphabet[bytes[size] & 61];
    }
    return id;
};
function createId(source, size) {
    if (size === void 0) { size = 16; }
    if (source)
        return hash(source, size);
    return randomId(size);
}
