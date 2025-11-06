"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = cors;
var localhost = /^https?:\/\/localhost(:\d+)?$/;
// Based on https://expressjs.com/en/resources/middleware/cors.html#configuration-options
function cors(config, origin) {
    if (origin === void 0) { origin = ""; }
    origin = origin.toLowerCase();
    // When it's true, reflect the origin
    if (config === true)
        return origin || null;
    // A star should always return a star
    if (config === "*")
        return "*";
    // No origin, it's okay since that means we don't need CORS
    if (!origin)
        return null;
    // Coming from localhost
    if (localhost.test(origin))
        return origin;
    var arr = Array.isArray(config)
        ? config
        : typeof config === "string"
            ? config.split(/\s*,\s*/g)
            : [];
    if (arr.includes(origin))
        return origin;
    console.warn("CORS: Origin \"".concat(origin, "\" not allowed. Allowed \"").concat(config, "\""));
    return null;
}
