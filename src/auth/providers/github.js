"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
var createId_js_1 = require("../../helpers/createId.js");
var reply_js_1 = require("../../reply.js");
var oauth = function (code) { return __awaiter(void 0, void 0, void 0, function () {
    var fch, res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                fch = function (url_1) {
                    var args_1 = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        args_1[_i - 1] = arguments[_i];
                    }
                    return __awaiter(void 0, __spreadArray([url_1], args_1, true), void 0, function (url, _a) {
                        var res;
                        if (_a === void 0) { _a = {}; }
                        var body = _a.body, _b = _a.headers, headers = _b === void 0 ? {} : _b, rest = __rest(_a, ["body", "headers"]);
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    headers.accept = "application/json";
                                    headers["content-type"] = "application/json";
                                    return [4 /*yield*/, fetch(url, __assign(__assign({}, rest), { body: body, headers: headers }))];
                                case 1:
                                    res = _c.sent();
                                    if (!res.ok)
                                        throw new Error("Invalid request");
                                    return [2 /*return*/, res.json()];
                            }
                        });
                    });
                };
                return [4 /*yield*/, fch("https://github.com/login/oauth/access_token", {
                        method: "post",
                        body: JSON.stringify({
                            client_id: env.GITHUB_ID,
                            client_secret: env.GITHUB_SECRET,
                            code: code,
                        }),
                    })];
            case 1:
                res = _a.sent();
                return [2 /*return*/, function (path) {
                        return fch("https://api.github.com".concat(path), {
                            headers: { Authorization: "Bearer ".concat(res.access_token) },
                        });
                    }];
        }
    });
}); };
var login = function githubLogin(ctx) {
    return (0, reply_js_1.redirect)("https://github.com/login/oauth/authorize?client_id=".concat(env.GITHUB_ID, "&scope=user:email"));
};
var getUserProfile = function (code) { return __awaiter(void 0, void 0, void 0, function () {
    var api, _a, profile, emails, email;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, oauth(code)];
            case 1:
                api = _c.sent();
                return [4 /*yield*/, Promise.all([
                        api("/user"),
                        api("/user/emails"),
                    ])];
            case 2:
                _a = _c.sent(), profile = _a[0], emails = _a[1];
                email = (_b = emails.sort(function (a) { return (a.primary ? -1 : 1); })[0]) === null || _b === void 0 ? void 0 : _b.email;
                return [2 /*return*/, __assign(__assign({}, profile), { email: email })];
        }
    });
}); };
var callback = function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, type, cleanUser, store, session, redirect, profile, auth, user;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = ctx.options.auth, type = _a.type, cleanUser = _a.cleanUser, store = _a.store, session = _a.session, redirect = _a.redirect;
                return [4 /*yield*/, getUserProfile(ctx.url.query.code)];
            case 1:
                profile = _b.sent();
                auth = {
                    id: (0, createId_js_1.default)(),
                    type: type,
                    provider: "github",
                    user: (0, createId_js_1.default)(profile.email),
                    email: profile.email,
                    time: new Date().toISOString().replace(/\.[0-9]*/, ""),
                };
                user = cleanUser({
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                    picture: profile.avatar_url,
                    location: profile.location,
                    created: profile.created_at,
                });
                return [4 /*yield*/, store.set(auth.user, user)];
            case 2:
                _b.sent();
                return [4 /*yield*/, session.set(auth.id, auth, { expires: "1w" })];
            case 3:
                _b.sent();
                if (auth.type === "token") {
                    return [2 /*return*/, (0, reply_js_1.status)(201).json(__assign(__assign({}, user), { token: auth.id }))];
                }
                if (auth.type === "cookie") {
                    return [2 /*return*/, (0, reply_js_1.status)(302).cookies({ authentication: auth.id }).redirect(redirect)];
                }
                if (auth.type === "jwt") {
                    throw new Error("JWT auth not supported yet");
                }
                if (auth.type === "key") {
                    throw new Error("Key auth not supported yet");
                }
                throw new Error("Unknown auth type");
        }
    });
}); };
exports.default = { login: login, callback: callback };
