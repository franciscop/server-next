"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = define;
// An amazing lazy-definition. It will _not_ parse these properties
// until needed, and once it has parsed them, it'll replace itself
// with the value at once, hence it's called 0-1 times even if the
// properties are accessed 0-N times
function define(obj, key, cb) {
    Object.defineProperty(obj, key, {
        configurable: true,
        get: function () {
            var value = cb(obj);
            Object.defineProperty(obj, key, {
                configurable: true,
                writable: true,
                value: value,
            });
            return obj[key];
        },
    });
}
