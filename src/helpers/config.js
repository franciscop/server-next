"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = config;
var index_js_1 = require("../auth/index.js");
var bucket_js_1 = require("./bucket.js");
var createId_1 = require("./createId");
var debugInfo_js_1 = require("./debugInfo.js");
var env = globalThis.env;
// Big mess; parse all of the options for server, which can be at launch time
// or dynamically per-request for the functions (so have to read ENV inside)
function config(options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var settings = {
        port: options.port || env.PORT || 3000,
        secret: options.secret || env.SECRET || "unsafe-".concat((0, createId_1.default)()),
    };
    // CORS
    options.cors = options.cors || env.CORS || null;
    if (options.cors) {
        var cors = {
            origin: "",
            methods: "",
            headers: "",
        };
        // TODO: replace '*' for request url
        if (options.cors === true) {
            cors.origin = "*";
        }
        else if (typeof options.cors === "string") {
            cors.origin = options.cors;
        }
        else if (Array.isArray(options.cors)) {
            cors.origin = options.cors.join(",");
        }
        else if (!options.cors.origin) {
            // cors is defined {}, but no explicit origin
            cors.origin = "*";
        }
        else if (typeof options.cors.origin === "string") {
            options.cors.origin = options.cors.origin;
        }
        else if (Array.isArray(options.cors.origin)) {
            cors.origin = options.cors.origin.join(",");
        }
        cors.origin = cors.origin.toLowerCase();
        if (typeof options.cors === "object" && !("methods" in options.cors)) {
            cors.methods = "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS";
        }
        // TODO: I don't think this is it
        if (typeof options.cors === "object" && !("headers" in options.cors)) {
            cors.headers = "*";
        }
        settings.cors = cors;
    }
    // Bucket
    settings.views = options.views ? (0, bucket_js_1.default)(options.views) : null;
    (0, debugInfo_js_1.default)(options, "views", function (views) { return (views === null || views === void 0 ? void 0 : views.location) || "true"; }, "📂");
    settings.public = options.public ? (0, bucket_js_1.default)(options.public) : null;
    (0, debugInfo_js_1.default)(options, "public", function (pub) { return (pub === null || pub === void 0 ? void 0 : pub.location) || "true"; }, "📂");
    settings.uploads = options.uploads ? (0, bucket_js_1.default)(options.uploads) : null;
    (0, debugInfo_js_1.default)(options, "uploads", function (ups) { return (ups === null || ups === void 0 ? void 0 : ups.location) || "true"; }, "📂");
    // Stores
    settings.store = (_a = options.store) !== null && _a !== void 0 ? _a : null;
    (0, debugInfo_js_1.default)(options, "store", function (store) { return (store === null || store === void 0 ? void 0 : store.name) || "working"; }, "📦");
    settings.cookies = (_b = options.cookies) !== null && _b !== void 0 ? _b : null;
    (0, debugInfo_js_1.default)(options, "cookies", function (cookies) { return (cookies === null || cookies === void 0 ? void 0 : cookies.name) || "working"; }, "🍪");
    if (options.store && !options.session) {
        settings.session = { store: options.store.prefix("session:") };
    }
    (0, debugInfo_js_1.default)(options, "session", function (session) { var _a; return ((_a = session === null || session === void 0 ? void 0 : session.store) === null || _a === void 0 ? void 0 : _a.name) || "working"; }, "🔐");
    // AUTH
    settings.auth = index_js_1.default.parseOptions(options.auth || env.AUTH || null, options);
    // OpenAPI
    if (options.openapi) {
        if (options.openapi === true) {
            settings.openapi = {};
        }
        // TODO
    }
    return settings;
}
