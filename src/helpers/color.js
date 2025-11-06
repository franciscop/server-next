"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = color;
// Add color to a string: color('hello {bright}world{/bright}')
// or a template literal: color`hello {bright}world{/bright}`
// Supports NO_COLOR, multiple styles, and closing with "{/}"
// prettier-ignore
var map = {
    reset: 0, bright: 1, dim: 2, under: 4, blink: 5, reverse: 7,
    black: 30, red: 31, green: 32, yellow: 33,
    blue: 34, magenta: 35, cyan: 36, white: 37,
    bgblack: 40, bgred: 41, bggreen: 42, bgyellow: 43,
    bgblue: 44, bgmagenta: 45, bgcyan: 46, bgwhite: 47,
};
var replace = function (k) {
    if (process.env.NO_COLOR)
        return "";
    if (!(k in map))
        throw new Error("\"{".concat(k, "}\" is not a valid color"));
    return "\u001B[".concat(map[k], "m");
};
function color(str) {
    var vals = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        vals[_i - 1] = arguments[_i];
    }
    if (typeof str === "string") {
        return str
            .replaceAll(/\{(\w+)\}/g, function (m, k) { return replace(k); })
            .replaceAll(/\{\/\w*\}/g, replace("reset"));
    }
    // Template literals, put them together first and then color them
    return color(str[0] + vals.map(function (v, i) { return v + str[i + 1]; }).join(""));
}
