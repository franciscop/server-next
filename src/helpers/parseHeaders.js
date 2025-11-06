"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function (raw) {
    var headers = {};
    for (var _i = 0, _a = raw.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        key = key.toLowerCase();
        if (headers[key]) {
            if (!Array.isArray(headers[key])) {
                headers[key] = [headers[key]];
            }
            headers[key].push(value);
        }
        else {
            headers[key] = value;
        }
    }
    return headers;
});
