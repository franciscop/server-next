"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("../index.js");
var NoSession = /** @class */ (function () {
    function NoSession() {
    }
    return NoSession;
}());
exports.default = new Proxy(NoSession, {
    get: function (target, key) {
        if (target[key])
            return target[key];
        if (key === "then")
            return target[key];
        if (typeof key === "symbol")
            return target[key];
        throw index_js_1.ServerError.NO_STORE_READ({ key: String(key) });
    },
    set: function (target, key, value) {
        if (target[key] || key === "then" || typeof key === "symbol") {
            target[key] = value;
            return true;
        }
        else {
            throw index_js_1.ServerError.NO_STORE_WRITE({ key: String(key) });
        }
    },
});
