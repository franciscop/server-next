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
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("../../helpers/index.js");
var index_js_2 = require("../../index.js");
var updateUser_js_1 = require("../updateUser.js");
var hash = new Proxy({}, {
    get: function (self, key) {
        var load = function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = Object).assign;
                        _c = [self];
                        return [4 /*yield*/, Promise.resolve().then(function () { return require("argon2"); }).catch(function () {
                                throw new index_js_2.ServerError.AUTH_ARGON_NEEDED();
                            })];
                    case 1: return [2 /*return*/, _b.apply(_a, _c.concat([_d.sent()]))];
                }
            });
        }); };
        if (key === "verify" && !self.verify) {
            return function (hash, pass) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, load()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, self.verify(hash, pass)];
                    }
                });
            }); };
        }
        if (key === "hash" && !self.hash) {
            return function (pass) { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, load()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, self.hash(pass)];
                    }
                });
            }); };
        }
        return self[key];
    },
});
var createSession = function (user, ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, type, session, cleanUser, _b, redirect, id, provider, time;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = ctx.options.auth, type = _a.type, session = _a.session, cleanUser = _a.cleanUser, _b = _a.redirect, redirect = _b === void 0 ? "/user" : _b;
                user = cleanUser(user);
                id = (0, index_js_1.createId)();
                provider = "email";
                time = new Date().toISOString().replace(/\.[0-9]*/, "");
                ctx.auth = {
                    id: id,
                    type: type,
                    provider: provider,
                    user: user.email,
                    email: user.email,
                    time: time,
                };
                return [4 /*yield*/, session.set(id, ctx.auth, { expires: "1w" })];
            case 1:
                _c.sent();
                if (type === "token") {
                    return [2 /*return*/, (0, index_js_2.status)(201).json(__assign(__assign({}, user), { token: id }))];
                }
                if (type === "cookie") {
                    return [2 /*return*/, (0, index_js_2.status)(302).cookies({ authentication: id }).redirect(redirect)];
                }
                if (type === "jwt") {
                    throw new Error("JWT auth not supported yet");
                }
                if (type === "key") {
                    throw new Error("Key auth not supported yet");
                }
                throw new Error("Unknown auth type");
        }
    });
}); };
function emailLogin(ctx) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, email, password, store, user, isValid;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = ctx.body, email = _a.email, password = _a.password;
                    if (!email)
                        throw index_js_2.ServerError.LOGIN_NO_EMAIL();
                    if (!/@/.test(email))
                        throw index_js_2.ServerError.LOGIN_INVALID_EMAIL();
                    if (!password)
                        throw index_js_2.ServerError.LOGIN_NO_PASSWORD();
                    if (password.length < 8)
                        throw index_js_2.ServerError.LOGIN_INVALID_PASSWORD();
                    store = ctx.options.auth.store;
                    return [4 /*yield*/, store.has(email)];
                case 1:
                    if (!(_b.sent()))
                        throw index_js_2.ServerError.LOGIN_WRONG_EMAIL();
                    return [4 /*yield*/, store.get(email)];
                case 2:
                    user = _b.sent();
                    return [4 /*yield*/, hash.verify(user.password, password)];
                case 3:
                    isValid = _b.sent();
                    if (!isValid)
                        throw index_js_2.ServerError.LOGIN_WRONG_PASSWORD();
                    return [2 /*return*/, createSession(user, ctx)];
            }
        });
    });
}
function emailRegister(ctx) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, email, password, data, store, time, user;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = ctx.body, email = _a.email, password = _a.password, data = __rest(_a, ["email", "password"]);
                    if (!email)
                        throw index_js_2.ServerError.REGISTER_NO_EMAIL();
                    if (!/@/.test(email))
                        throw index_js_2.ServerError.REGISTER_INVALID_EMAIL();
                    if (!password)
                        throw index_js_2.ServerError.REGISTER_NO_PASSWORD();
                    if (password.length < 8)
                        throw index_js_2.ServerError.REGISTER_INVALID_PASSWORD();
                    store = ctx.options.auth.store;
                    return [4 /*yield*/, store.has(email)];
                case 1:
                    if (_c.sent())
                        throw index_js_2.ServerError.REGISTER_EMAIL_EXISTS();
                    time = new Date().toISOString().replace(/\.[0-9]*/, "");
                    _b = { id: (0, index_js_1.createId)(email), email: email };
                    return [4 /*yield*/, hash.hash(password)];
                case 2:
                    user = __assign.apply(void 0, [(_b.password = _c.sent(), _b.time = time, _b), data]);
                    return [4 /*yield*/, store.set(email, user)];
                case 3:
                    _c.sent();
                    return [2 /*return*/, createSession(user, ctx)];
            }
        });
    });
}
function emailResetPassword(ctx) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
function emailUpdatePassword(ctx) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, previous, updated, fullUser, isValid, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = ctx.body, previous = _a.previous, updated = _a.updated;
                    return [4 /*yield*/, ctx.options.auth.store.get(ctx.auth.user)];
                case 1:
                    fullUser = _c.sent();
                    return [4 /*yield*/, hash.verify(fullUser.password, previous)];
                case 2:
                    isValid = _c.sent();
                    if (!isValid)
                        throw index_js_2.ServerError.LOGIN_WRONG_PASSWORD();
                    _b = fullUser;
                    return [4 /*yield*/, hash.hash(updated)];
                case 3:
                    _b.password = _c.sent();
                    return [4 /*yield*/, (0, updateUser_js_1.default)(fullUser, ctx.auth, ctx.options.auth.store)];
                case 4:
                    _c.sent();
                    return [2 /*return*/, 200];
            }
        });
    });
}
exports.default = {
    login: emailLogin,
    register: emailRegister,
    reset: emailResetPassword,
    password: emailUpdatePassword,
};
