"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("../auth/index.js");
var helpers_1 = require("../helpers");
var parseBody_js_1 = require("./parseBody.js");
var parseCookies_js_1 = require("./parseCookies.js");
function isValidMethod(method) {
    return [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "options",
        "socket",
    ].includes(method);
}
// Headers come like [title1, value1, title2, value2, ...]
// https://stackoverflow.com/a/54029307/938236
var chunkArray = function (arr, size) {
    return arr.length > size
        ? __spreadArray([arr.slice(0, size)], chunkArray(arr.slice(size), size), true) : [arr];
};
exports.default = (function (request, app) { return __awaiter(void 0, void 0, void 0, function () {
    var ctx_1, method, events_1, https, host, path, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                ctx_1 = {};
                ctx_1.options = app.opts || {};
                ctx_1.req = request;
                ctx_1.res = { status: null, headers: {}, cookies: {} };
                method = ((_a = request.method) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "get";
                // Validate that the method is one of the allowed HTTP methods
                if (![
                    "get",
                    "post",
                    "put",
                    "patch",
                    "delete",
                    "head",
                    "options",
                    "socket",
                ].includes(method)) {
                    throw new Error("Invalid HTTP method: ".concat(method));
                }
                ctx_1.method = method;
                events_1 = {};
                ctx_1.on = function (name, callback) {
                    events_1[name] = events_1[name] || [];
                    events_1[name].push(callback);
                };
                ctx_1.trigger = function (name, data) {
                    if (!events_1[name])
                        return;
                    for (var _i = 0, _a = events_1[name]; _i < _a.length; _i++) {
                        var cb = _a[_i];
                        cb(data);
                    }
                };
                ctx_1.headers = (0, helpers_1.parseHeaders)(new Headers(chunkArray(request.rawHeaders, 2)));
                ctx_1.cookies = (0, parseCookies_js_1.default)(ctx_1.headers.cookie);
                return [4 /*yield*/, index_js_1.default.load(ctx_1)];
            case 1:
                _c.sent();
                https = ((_b = request.connection) === null || _b === void 0 ? void 0 : _b.encrypted) ? "https" : "http";
                host = ctx_1.headers.host || "localhost:".concat(ctx_1.options.port);
                path = (request.url || "/").replace(/\/$/, "") || "/";
                ctx_1.url = new URL(path, "".concat(https, "://").concat(host));
                (0, helpers_1.define)(ctx_1.url, "query", function (url) {
                    return Object.fromEntries(url.searchParams.entries());
                });
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        var body = [];
                        request
                            .on("data", function (chunk) {
                            body.push(chunk);
                        })
                            .on("end", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var type, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        type = ctx_1.headers["content-type"];
                                        _a = ctx_1;
                                        return [4 /*yield*/, (0, parseBody_js_1.default)(Buffer.concat(body).toString(), type, ctx_1.options.uploads)];
                                    case 1:
                                        _a.body = _b.sent();
                                        resolve();
                                        return [2 /*return*/];
                                }
                            });
                        }); })
                            .on("error", reject);
                    })];
            case 2:
                _c.sent();
                ctx_1.app = app;
                ctx_1.platform = app.platform;
                ctx_1.machine = app.platform;
                return [2 /*return*/, ctx_1];
            case 3:
                error_1 = _c.sent();
                return [2 /*return*/, { error: error_1 }];
            case 4: return [2 /*return*/];
        }
    });
}); });
