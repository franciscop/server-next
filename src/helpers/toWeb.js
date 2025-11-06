"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = toWeb;
function toWeb(nodeStream) {
    if (typeof ReadableStream === "undefined") {
        throw new Error("Environment not supported, please report this as a bug");
    }
    return new ReadableStream({
        start: function (controller) {
            nodeStream.on("data", function (chunk) { return controller.enqueue(chunk); });
            nodeStream.on("end", function () { return controller.close(); });
            nodeStream.on("error", function (err) { return controller.error(err); });
        },
        cancel: function () {
            nodeStream.destroy();
        },
    });
}
