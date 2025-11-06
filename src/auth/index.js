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
var auth_js_1 = require("./auth.js");
var logout_js_1 = require("./logout.js");
var index_js_1 = require("./providers/index.js");
var session_js_1 = require("./session.js");
var user_js_1 = require("./user.js");
var parseOptions = function (auth, all) {
    if (!auth)
        return null;
    if (typeof auth === "string") {
        var _a = auth.split(":"), type = _a[0], provider = _a[1];
        auth = { type: type, provider: provider };
    }
    // if (typeof auth.type === "string") {
    //   auth.type = auth.type.split("|").filter(Boolean);
    // }
    if (typeof auth.provider === "string") {
        auth.provider = auth.provider.split("|").filter(Boolean);
    }
    if (!auth.type) {
        throw new Error("Auth options needs a type");
    }
    // if (!auth.type.length) {
    //   throw new Error("Auth options needs a type");
    // }
    if (!auth.provider || !auth.provider.length) {
        throw new Error("Auth options needs a provider");
    }
    var providerNotFound = auth.provider.find(function (p) { return !index_js_1.default[p]; });
    if (providerNotFound) {
        throw new Error("Provider \"".concat(providerNotFound, "\" not found, available ones are \"").concat(Object.keys(index_js_1.default).join('", "'), "\""));
    }
    if (!auth.session && all.store) {
        auth.session = all.store.prefix("auth:");
    }
    if (!auth.store && all.store) {
        auth.store = all.store.prefix("user:");
    }
    if (!auth.cleanUser) {
        auth.cleanUser = function (fullUser) {
            var password = fullUser.password, token = fullUser.token, user = __rest(fullUser, ["password", "token"]);
            return user;
        };
    }
    if (!auth.redirect) {
        auth.redirect = "/user";
    }
    return auth;
};
var load = function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = ctx;
                return [4 /*yield*/, (0, session_js_1.default)(ctx)];
            case 1:
                _a.session = _d.sent();
                _b = ctx;
                return [4 /*yield*/, (0, auth_js_1.default)(ctx)];
            case 2:
                _b.auth = _d.sent();
                _c = ctx;
                return [4 /*yield*/, (0, user_js_1.default)(ctx)];
            case 3:
                _c.user = _d.sent();
                return [2 /*return*/];
        }
    });
}); };
var middle = function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (ctx.options.auth) {
            if (ctx.options.auth.provider.includes("github")) {
                if (!env.GITHUB_ID)
                    throw new Error("GITHUB_ID not defined");
                if (!env.GITHUB_SECRET)
                    throw new Error("GITHUB_SECRET not defined");
                ctx.app.get("/auth/logout", { tags: "Auth", title: "Github logout" }, logout_js_1.default);
                ctx.app.get("/auth/login/github", { tags: "Auth" }, index_js_1.default.github.login);
                ctx.app.get("/auth/callback/github", { tags: "Auth", title: "Github callback" }, index_js_1.default.github.callback);
            }
            if (ctx.options.auth.provider.includes("email")) {
                ctx.app.post("/auth/logout", { tags: "Auth" }, logout_js_1.default);
                ctx.app.post("/auth/register/email", { tags: "Auth" }, index_js_1.default.email.register);
                ctx.app.post("/auth/login/email", { tags: "Auth" }, index_js_1.default.email.login);
                ctx.app.put("/auth/password/email", { tags: "Auth" }, index_js_1.default.email.password);
                ctx.app.put("/auth/reset/email", { tags: "Auth" }, index_js_1.default.email.reset);
            }
        }
        return [2 /*return*/];
    });
}); };
exports.default = { load: load, parseOptions: parseOptions, middle: middle };
