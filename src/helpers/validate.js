"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validate;
var StatusError_js_1 = require("./StatusError.js");
function validate(ctx, schema) {
    var _a, _b;
    if (!schema || typeof schema !== "object")
        return;
    var base;
    try {
        if (typeof (schema === null || schema === void 0 ? void 0 : schema.body) === "function") {
            base = "body";
            schema.body(ctx.body || {});
        }
        if (typeof ((_a = schema === null || schema === void 0 ? void 0 : schema.body) === null || _a === void 0 ? void 0 : _a.parse) === "function") {
            base = "body";
            schema.body.parse(ctx.body || {});
        }
        if (typeof (schema === null || schema === void 0 ? void 0 : schema.query) === "function") {
            base = "query";
            schema.query(ctx.url.query || {});
        }
        if (typeof ((_b = schema === null || schema === void 0 ? void 0 : schema.query) === null || _b === void 0 ? void 0 : _b.parse) === "function") {
            base = "query";
            schema.query.parse(ctx.url.query || {});
        }
    }
    catch (error) {
        if (error.name === "ZodError" || error.constructor.name === "ZodError") {
            var message = error.issues
                .map(function (_a) {
                var path = _a.path, message = _a.message;
                return "[".concat(base, ".").concat(path.join("."), "]: ").concat(message);
            })
                .sort()
                .join("\n");
            throw new StatusError_js_1.default(message, 422);
        }
        throw error;
    }
}
