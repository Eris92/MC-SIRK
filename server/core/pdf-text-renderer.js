"use strict";

var PAGE_WIDTH = 595;
var PAGE_HEIGHT = 842;
var MARGIN_X = 42;
var MARGIN_Y = 46;
var CELL = 1.55;
var GLYPH_W = 5;
var GLYPH_H = 7;
var ADVANCE = 6 * CELL;
var LINE_HEIGHT = 12.5;
var MAX_COLUMNS = Math.floor((PAGE_WIDTH - (MARGIN_X * 2)) / ADVANCE);
var MAX_LINES = Math.floor((PAGE_HEIGHT - (MARGIN_Y * 2)) / LINE_HEIGHT);

var FONT = {
    "A":["01110","10001","10001","11111","10001","10001","10001"],
    "B":["11110","10001","10001","11110","10001","10001","11110"],
    "C":["01111","10000","10000","10000","10000","10000","01111"],
    "D":["11110","10001","10001","10001","10001","10001","11110"],
    "E":["11111","10000","10000","11110","10000","10000","11111"],
    "F":["11111","10000","10000","11110","10000","10000","10000"],
    "G":["01111","10000","10000","10111","10001","10001","01111"],
    "H":["10001","10001","10001","11111","10001","10001","10001"],
    "I":["11111","00100","00100","00100","00100","00100","11111"],
    "J":["00111","00010","00010","00010","10010","10010","01100"],
    "K":["10001","10010","10100","11000","10100","10010","10001"],
    "L":["10000","10000","10000","10000","10000","10000","11111"],
    "M":["10001","11011","10101","10101","10001","10001","10001"],
    "N":["10001","11001","10101","10011","10001","10001","10001"],
    "O":["01110","10001","10001","10001","10001","10001","01110"],
    "P":["11110","10001","10001","11110","10000","10000","10000"],
    "Q":["01110","10001","10001","10001","10101","10010","01101"],
    "R":["11110","10001","10001","11110","10100","10010","10001"],
    "S":["01111","10000","10000","01110","00001","00001","11110"],
    "T":["11111","00100","00100","00100","00100","00100","00100"],
    "U":["10001","10001","10001","10001","10001","10001","01110"],
    "V":["10001","10001","10001","10001","10001","01010","00100"],
    "W":["10001","10001","10001","10101","10101","11011","10001"],
    "X":["10001","10001","01010","00100","01010","10001","10001"],
    "Y":["10001","10001","01010","00100","00100","00100","00100"],
    "Z":["11111","00001","00010","00100","01000","10000","11111"],
    "0":["01110","10001","10011","10101","11001","10001","01110"],
    "1":["00100","01100","00100","00100","00100","00100","01110"],
    "2":["01110","10001","00001","00010","00100","01000","11111"],
    "3":["11110","00001","00001","01110","00001","00001","11110"],
    "4":["00010","00110","01010","10010","11111","00010","00010"],
    "5":["11111","10000","10000","11110","00001","00001","11110"],
    "6":["01110","10000","10000","11110","10001","10001","01110"],
    "7":["11111","00001","00010","00100","01000","01000","01000"],
    "8":["01110","10001","10001","01110","10001","10001","01110"],
    "9":["01110","10001","10001","01111","00001","00001","01110"],
    "?":["01110","10001","00001","00010","00100","00000","00100"],
    "!":["00100","00100","00100","00100","00100","00000","00100"],
    ".":["00000","00000","00000","00000","00000","00000","00100"],
    ",":["00000","00000","00000","00000","00000","00100","01000"],
    ":":["00000","00100","00000","00000","00100","00000","00000"],
    ";":["00000","00100","00000","00000","00100","00100","01000"],
    "-":["00000","00000","00000","11111","00000","00000","00000"],
    "_":["00000","00000","00000","00000","00000","00000","11111"],
    "/":["00001","00010","00010","00100","01000","01000","10000"],
    "\\":["10000","01000","01000","00100","00010","00010","00001"],
    "(":["00010","00100","01000","01000","01000","00100","00010"],
    ")":["01000","00100","00010","00010","00010","00100","01000"],
    "[":["01110","01000","01000","01000","01000","01000","01110"],
    "]":["01110","00010","00010","00010","00010","00010","01110"],
    "+":["00000","00100","00100","11111","00100","00100","00000"],
    "=":["00000","00000","11111","00000","11111","00000","00000"],
    "@":["01110","10001","10111","10101","10111","10000","01110"],
    "#":["01010","01010","11111","01010","11111","01010","01010"],
    "&":["01100","10010","10100","01000","10101","10010","01101"],
    "' ":["00000","00000","00000","00000","00000","00000","00000"],
    "\"":["01010","01010","01010","00000","00000","00000","00000"]
};

var POLISH = {
    "Ą": { base: "A", mark: "ogonek" },
    "Ć": { base: "C", mark: "acute" },
    "Ę": { base: "E", mark: "ogonek" },
    "Ł": { base: "L", mark: "slash" },
    "Ń": { base: "N", mark: "acute" },
    "Ó": { base: "O", mark: "acute" },
    "Ś": { base: "S", mark: "acute" },
    "Ź": { base: "Z", mark: "acute" },
    "Ż": { base: "Z", mark: "dot" }
};

function glyphInfo(character) {
    if (character === " ") return { rows: null, mark: "" };
    var upper = String(character || "?").toUpperCase();
    if (POLISH[upper]) return { rows: FONT[POLISH[upper].base], mark: POLISH[upper].mark };
    return { rows: FONT[upper] || FONT["?"], mark: "" };
}

function supportedCharacter(character) {
    if (character === " " || character === "\t") return true;
    var upper = String(character || "").toUpperCase();
    return !!FONT[upper] || !!POLISH[upper];
}

function unsupportedCharacters(value) {
    var seen = Object.create(null), result = [];
    Array.from(String(value == null ? "" : value)).forEach(function (character) {
        if (character === "\r" || character === "\n" || supportedCharacter(character)) return;
        if (!seen[character]) { seen[character] = true; result.push(character); }
    });
    return result;
}

function wrapLine(line) {
    line = String(line == null ? "" : line).replace(/\t/g, "    ");
    if (line.length <= MAX_COLUMNS) return [line];
    var result = [];
    while (line.length > MAX_COLUMNS) {
        var cut = line.lastIndexOf(" ", MAX_COLUMNS);
        if (cut < Math.floor(MAX_COLUMNS * 0.55)) cut = MAX_COLUMNS;
        result.push(line.slice(0, cut).trimEnd());
        line = line.slice(cut).trimStart();
    }
    result.push(line);
    return result;
}

function normalizedLines(value) {
    var result = [];
    String(value == null ? "" : value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").forEach(function (line) {
        wrapLine(line).forEach(function (wrapped) { result.push(wrapped); });
    });
    return result.length ? result : [""];
}

function rect(commands, x, y, width, height) {
    commands.push(x.toFixed(2) + " " + y.toFixed(2) + " " + width.toFixed(2) + " " + height.toFixed(2) + " re f");
}

function drawMark(commands, x, y, mark) {
    if (mark === "acute") {
        rect(commands, x + (3.2 * CELL), y + (7.4 * CELL), CELL, CELL);
        rect(commands, x + (4.1 * CELL), y + (8.2 * CELL), CELL, CELL);
    } else if (mark === "dot") {
        rect(commands, x + (2.2 * CELL), y + (8.0 * CELL), CELL, CELL);
    } else if (mark === "ogonek") {
        rect(commands, x + (3.2 * CELL), y - (1.0 * CELL), CELL, CELL);
        rect(commands, x + (4.0 * CELL), y - (1.8 * CELL), CELL, CELL);
    } else if (mark === "slash") {
        rect(commands, x + (0.7 * CELL), y + (2.5 * CELL), 4.0 * CELL, 0.8 * CELL);
    }
}

function drawCharacter(commands, x, baselineY, character) {
    if (character === " ") return;
    var glyph = glyphInfo(character);
    var rows = glyph.rows || FONT["?"];
    for (var row = 0; row < GLYPH_H; row++) {
        for (var column = 0; column < GLYPH_W; column++) {
            if (rows[row].charAt(column) !== "1") continue;
            rect(commands, x + (column * CELL), baselineY + ((GLYPH_H - 1 - row) * CELL), CELL, CELL);
        }
    }
    drawMark(commands, x, baselineY, glyph.mark);
}

function pageContent(lines) {
    var commands = ["0 0 0 rg"];
    lines.forEach(function (line, lineIndex) {
        var y = PAGE_HEIGHT - MARGIN_Y - ((lineIndex + 1) * LINE_HEIGHT);
        Array.from(String(line)).slice(0, MAX_COLUMNS).forEach(function (character, column) {
            drawCharacter(commands, MARGIN_X + (column * ADVANCE), y, character);
        });
    });
    return commands.join("\n") + "\n";
}

function buildPdf(pageStreams) {
    var objects = [];
    function add(value) { objects.push(value); return objects.length; }
    var catalogId = add("");
    var pagesId = add("");
    var pageIds = [];
    pageStreams.forEach(function (stream) {
        var contentId = add("<< /Length " + Buffer.byteLength(stream, "ascii") + " >>\nstream\n" + stream + "endstream");
        var pageId = add("<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " + PAGE_WIDTH + " " + PAGE_HEIGHT + "] /Resources << >> /Contents " + contentId + " 0 R >>");
        pageIds.push(pageId);
    });
    objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
    objects[pagesId - 1] = "<< /Type /Pages /Count " + pageIds.length + " /Kids [" + pageIds.map(function (id) { return id + " 0 R"; }).join(" ") + "] >>";

    var chunks = ["%PDF-1.4\n%SIRK\n"];
    var offsets = [0];
    var length = Buffer.byteLength(chunks[0], "ascii");
    objects.forEach(function (object, index) {
        offsets.push(length);
        var chunk = (index + 1) + " 0 obj\n" + object + "\nendobj\n";
        chunks.push(chunk);
        length += Buffer.byteLength(chunk, "ascii");
    });
    var xref = length;
    chunks.push("xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n");
    for (var i = 1; i < offsets.length; i++) chunks.push(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
    chunks.push("trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalogId + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    return Buffer.from(chunks.join(""), "ascii");
}

function renderTextPdf(value) {
    var lines = normalizedLines(value);
    var pages = [];
    for (var index = 0; index < lines.length; index += MAX_LINES) pages.push(pageContent(lines.slice(index, index + MAX_LINES)));
    return buildPdf(pages.length ? pages : [pageContent([""])]);
}

module.exports = {
    renderTextPdf: renderTextPdf,
    unsupportedCharacters: unsupportedCharacters,
    supportedCharacter: supportedCharacter
};
