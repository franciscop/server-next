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
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("../auth/index.js");
var helpers_1 = require("../helpers");
var parseBody_js_1 = require("./parseBody.js");
var parseCookies_js_1 = require("./parseCookies.js");
exports.default = (function (request, app) { return __awaiter(void 0, void 0, void 0, function () {
    var ctx, events_1, type, _a, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                ctx = {};
                ctx.init = performance.now();
                ctx.options = app.opts || {};
                ctx.req = request;
                ctx.res = { status: null, headers: {}, cookies: {} };
                ctx.method = request.method.toLowerCase();
                events_1 = {};
                ctx.on = function (name, callback) {
                    events_1[name] = events_1[name] || [];
                    events_1[name].push(callback);
                };
                ctx.trigger = function (name, data) {
                    if (!events_1[name])
                        return;
                    for (var _i = 0, _a = events_1[name]; _i < _a.length; _i++) {
                        var cb = _a[_i];
                        cb(data);
                    }
                };
                ctx.headers = (0, helpers_1.parseHeaders)(request.headers);
                ctx.cookies = (0, parseCookies_js_1.default)(ctx.headers.cookie);
                return [4 /*yield*/, index_js_1.default.load(ctx)];
            case 1:
                _b.sent();
                ctx.url = new URL(request.url.replace(/\/$/, ""));
                (0, helpers_1.define)(ctx.url, "query", function (url) {
                    return Object.fromEntries(url.searchParams.entries());
                });
                if (!request.body) return [3 /*break*/, 3];
                type = ctx.headers["content-type"];
                _a = ctx;
                return [4 /*yield*/, (0, parseBody_js_1.default)(request, type, ctx.options.uploads)];
            case 2:
                _a.body = _b.sent();
                _b.label = 3;
            case 3:
                ctx.app = app;
                ctx.platform = app.platform;
                ctx.machine = app.platform;
                return [2 /*return*/, ctx];
            case 4:
                error_1 = _b.sent();
                return [2 /*return*/, { error: error_1 }];
            case 5: return [2 /*return*/];
        }
    });
}); });
