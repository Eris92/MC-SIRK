"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "seed", "MyScripts", "settings", "Settings.svg"), "utf8");
assert.ok(/viewBox="0 0 48 48"/.test(source), "Settings icon must retain its canonical 48x48 geometry.");
assert.ok(/<path d="M20 5h8l2 6 5 3 6-1/.test(source), "Settings icon must preserve the existing outer gear path.");
assert.ok(/<circle cx="24" cy="26" r="7"/.test(source), "The inner gear circle must sit approximately one rendered pixel below its previous position.");
assert.strictEqual(/<circle cx="24" cy="24" r="7"/.test(source), false, "The visually high inner circle must not return.");
console.log("Settings folder gear optical center: OK");
