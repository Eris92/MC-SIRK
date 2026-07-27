"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var runtime = fs.readFileSync(path.join(root, "server/core/portal-experience-runtime.js"), "utf8");
var settings = fs.readFileSync(path.join(root, "public/portal/vendor/settings-structure.js"), "utf8");
var branding = fs.readFileSync(path.join(root, "public/portal/standalone/scripts/branding.js"), "utf8");

assert.ok(runtime.indexOf("BUILT_IN_ANIMATIONS") >= 0, "Runtime must define built-in animations.");
assert.ok(runtime.indexOf("portalSettings.animations = animations") >= 0, "Animation settings must be normalized before saving.");
assert.ok(runtime.indexOf("animations: animations(portalSettings.animations)") >= 0, "Public Portal configuration must contain animations.");

assert.ok(settings.indexOf('ensureLeaf(portal, "Animacje"') >= 0, "Portal settings must contain the Animacje tab.");
assert.ok(settings.indexOf('"Dodaj animację"') >= 0, "Portal settings must allow custom animations to be added.");
assert.ok(settings.indexOf('"Podgląd animacji"') >= 0, "Portal settings must provide an animation preview.");
assert.ok(settings.indexOf('"Padający śnieg"') >= 0, "Snow must be available as a built-in animation.");
assert.ok(settings.indexOf('"Confetti"') >= 0, "Confetti must be available as a built-in animation.");
assert.ok(settings.indexOf('"Postać przechodząca przez stronę"') >= 0, "Walker must be available as a built-in animation.");
assert.ok(settings.indexOf('"Motyw świąteczny"') >= 0, "Christmas must be available as a built-in animation.");

assert.ok(branding.indexOf("SirkPortalAnimations") >= 0, "Portal must expose the animation preview controller.");
assert.ok(branding.indexOf("prefers-reduced-motion") >= 0, "Animations must respect reduced motion preferences.");
assert.ok(branding.indexOf("sirkAnimationFall") >= 0, "Falling animations must be rendered.");
assert.ok(branding.indexOf("sirkAnimationWalk") >= 0, "Walker animations must be rendered.");

console.log("Portal animations: OK");
