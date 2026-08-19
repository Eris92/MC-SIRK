"use strict";

module.exports.resolve = function (context) {
    var path = context.nativePath || context.path;
    return path.join(context.pluginRoot, "seed", "MyScripts");
};
