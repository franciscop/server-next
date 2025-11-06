"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseCookies;
function parseCookies(cookies) {
    if (!cookies)
        return {};
    // If it's an array, just use the first cookie header
    var cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
    if (!cookieStr)
        return {};
    return Object.fromEntries(cookieStr.split(/;\s*/).map(function (part) {
        var _a = part.split("="), key = _a[0], rest = _a.slice(1);
        return [key, decodeURIComponent(rest.join("="))];
    }));
}
