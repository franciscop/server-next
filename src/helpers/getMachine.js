"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getMachine;
function getProvider() {
    if (typeof Netlify !== "undefined")
        return "netlify";
    return null;
}
function getRuntime() {
    var _a, _b;
    if (typeof Bun !== "undefined")
        return "bun";
    if (typeof Deno !== "undefined")
        return "deno";
    if ((_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.versions) === null || _b === void 0 ? void 0 : _b.node)
        return "node";
    return null;
}
function getProduction() {
    // Can I cry now?
    if (typeof Netlify !== "undefined")
        return Netlify.env.get("NETLIFY_DEV") !== "true";
    return process.env.NODE_ENV === "production";
}
function getMachine() {
    return {
        provider: getProvider(),
        runtime: getRuntime(),
        production: getProduction(),
    };
}
