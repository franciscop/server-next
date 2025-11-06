"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = debugInfo;
var color_js_1 = require("./color.js");
var isDebug = process.argv.includes("--debug");
function debugInfo(options, name, cb, icon) {
    if (icon === void 0) { icon = ""; }
    if (!isDebug)
        return;
    if (!options[name]) {
        return console.log((0, color_js_1.default)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["options:", "\t\u2192 {dim}[not set]{/}"], ["options:", "\\t\u2192 {dim}[not set]{/}"])), String(name)));
    }
    console.log((0, color_js_1.default)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["options:", "\t\u2192 ", "", ""], ["options:", "\\t\u2192 ", "", ""])), String(name), icon ? icon + " " : "", cb(options[name])));
}
var templateObject_1, templateObject_2;
