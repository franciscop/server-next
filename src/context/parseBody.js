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
exports.default = parseBody;
var helpers_1 = require("../helpers");
function getBoundary(header) {
    if (!header)
        return null;
    // When we set the `content-type` manually on fetch(), it won't include the
    // boundary and it's recommended not to set it manually:
    // https://stackoverflow.com/q/39280438/938236
    if (header.includes("multipart/form-data") && !header.includes("boundary=")) {
        console.error("Do not set the `Content-Type` manually for FormData");
    }
    var items = header.split(";");
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        var trimmedItem = item.trim();
        if (trimmedItem.startsWith("boundary=")) {
            return trimmedItem.split("=")[1].trim();
        }
    }
    return null;
}
function getMatching(string, regex) {
    var matches = string.match(regex);
    return (matches === null || matches === void 0 ? void 0 : matches[1]) ? matches[1] : "";
}
var saveFile = function (name, value, bucket) { return __awaiter(void 0, void 0, void 0, function () {
    var ext, id;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ext = name.split(".").pop();
                id = "".concat((0, helpers_1.createId)(), ".").concat(ext);
                return [4 /*yield*/, bucket.write(id, value.toString("binary"))];
            case 1:
                _a.sent();
                return [2 /*return*/, id];
        }
    });
}); };
// Utility function to split a buffer
function splitBuffer(buffer, delimiter) {
    var result = [];
    var start = 0;
    var index = buffer.indexOf(delimiter, start);
    while (index !== -1) {
        result.push(buffer.slice(start, index));
        start = index + delimiter.length;
        index = buffer.indexOf(delimiter, start);
    }
    result.push(buffer.slice(start));
    return result;
}
var BREAK = "\r\n\r\n";
function parseBody(raw, contentType, bucket) {
    return __awaiter(this, void 0, void 0, function () {
        var contentTypeStr, baseBuffer, _a, rawBuffer, boundary, body, boundaryBuffer, parts, _i, parts_1, part, partString, name_1, filename, content, _b, _c, value;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    contentTypeStr = Array.isArray(contentType)
                        ? contentType[0]
                        : contentType;
                    if (!(typeof raw === "string")) return [3 /*break*/, 1];
                    _a = raw;
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, raw.arrayBuffer()];
                case 2:
                    _a = _d.sent();
                    _d.label = 3;
                case 3:
                    baseBuffer = _a;
                    rawBuffer = Buffer.from(baseBuffer);
                    if (!rawBuffer)
                        return [2 /*return*/, {}];
                    if (!contentTypeStr || /text\/plain/.test(contentTypeStr)) {
                        return [2 /*return*/, rawBuffer.toString()]; // Return as plain text
                    }
                    if (/application\/json/.test(contentTypeStr)) {
                        return [2 /*return*/, JSON.parse(rawBuffer.toString())]; // Parse JSON
                    }
                    boundary = getBoundary(contentTypeStr);
                    if (!boundary)
                        return [2 /*return*/, null];
                    body = {};
                    boundaryBuffer = Buffer.from("--".concat(boundary));
                    parts = splitBuffer(rawBuffer, boundaryBuffer);
                    _i = 0, parts_1 = parts;
                    _d.label = 4;
                case 4:
                    if (!(_i < parts_1.length)) return [3 /*break*/, 8];
                    part = parts_1[_i];
                    if (part.length === 0 || part.equals(Buffer.from("--\r\n")))
                        return [3 /*break*/, 7];
                    partString = part.toString();
                    name_1 = getMatching(partString, /(?:name=")(.+?)(?:")/)
                        .trim()
                        .replace(/\[\]$/, "");
                    if (!name_1)
                        return [3 /*break*/, 7];
                    filename = getMatching(partString, /(?:filename=")(.*?)(?:")/).trim();
                    if (!part.includes(BREAK))
                        return [3 /*break*/, 7];
                    content = part.slice(part.indexOf(BREAK) + 4, part.length - 2);
                    if (!filename) return [3 /*break*/, 6];
                    // Save binary content as a file
                    if (!bucket) {
                        throw new Error("Bucket is required to save files");
                    }
                    _b = body;
                    _c = name_1;
                    return [4 /*yield*/, saveFile(filename, content, bucket)];
                case 5:
                    _b[_c] = _d.sent();
                    return [3 /*break*/, 7];
                case 6:
                    value = content.toString().trim();
                    if (body[name_1]) {
                        if (!Array.isArray(body[name_1])) {
                            body[name_1] = [body[name_1]];
                        }
                        body[name_1].push(value);
                    }
                    else {
                        body[name_1] = value;
                    }
                    _d.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8: return [2 /*return*/, body];
            }
        });
    });
}
