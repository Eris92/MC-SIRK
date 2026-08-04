(function () {
    "use strict";

    window.MeshPluginCore = window.MeshPluginCore || {};
    window.SirkPlatformCore = window.SirkPlatformCore || {};

    var meshCore = window.MeshPluginCore;
    var sirkCore = window.SirkPlatformCore;

    if (meshCore !== sirkCore) {
        var initialOwner = meshCore.activePlugin || sirkCore.activePlugin || null;
        meshCore.activePlugin = initialOwner;

        Object.defineProperty(sirkCore, "activePlugin", {
            configurable: true,
            enumerable: true,
            get: function () {
                return meshCore.activePlugin || null;
            },
            set: function (value) {
                meshCore.activePlugin = value || null;
            }
        });
    }

    window.MeshPluginCore = meshCore;
}());
