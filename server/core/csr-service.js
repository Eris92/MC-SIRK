"use strict";

// #407: strict PKCS#10 CSR validation and issued-certificate verification.
// The CSR body is never logged; only structural facts leave this module.

var crypto = require("crypto");

var MAX_CSR_BYTES = 32 * 1024;
var PEM_PATTERN = /^\s*-----BEGIN (NEW )?CERTIFICATE REQUEST-----\r?\n([A-Za-z0-9+/=\r\n]+?)\r?\n?-----END (NEW )?CERTIFICATE REQUEST-----\s*$/;
var SIGNATURE_ALGORITHMS = {
    "1.2.840.113549.1.1.11": "sha256",
    "1.2.840.113549.1.1.12": "sha384",
    "1.2.840.113549.1.1.13": "sha512",
    "1.2.840.10045.4.3.2": "sha256",
    "1.2.840.10045.4.3.3": "sha384",
    "1.2.840.10045.4.3.4": "sha512",
    "1.3.101.112": null
};
var RSA_PSS = "1.2.840.113549.1.1.10";

function fail(message) { throw new Error(message || "The file is not a valid PKCS#10 certificate request."); }

function readTlv(buffer, offset, end) {
    if (offset + 2 > end) fail();
    var tag = buffer[offset];
    var first = buffer[offset + 1];
    var headerLength = 2;
    var length;
    if (first < 0x80) length = first;
    else {
        var count = first & 0x7f;
        if (count < 1 || count > 4 || offset + 2 + count > end) fail();
        length = 0;
        for (var index = 0; index < count; index++) length = length * 256 + buffer[offset + 2 + index];
        if (length < 0x80 || (count > 1 && buffer[offset + 2] === 0)) fail();
        headerLength += count;
    }
    var start = offset + headerLength;
    if (start + length > end) fail();
    return { tag: tag, start: start, end: start + length, offset: offset, next: start + length };
}

function children(buffer, tlv) {
    var items = [];
    var offset = tlv.start;
    while (offset < tlv.end) {
        var item = readTlv(buffer, offset, tlv.end);
        items.push(item);
        offset = item.next;
    }
    if (offset !== tlv.end) fail();
    return items;
}

function oid(buffer, tlv) {
    if (tlv.tag !== 0x06 || tlv.end <= tlv.start) fail();
    var values = [];
    var value = 0;
    for (var index = tlv.start; index < tlv.end; index++) {
        value = value * 128 + (buffer[index] & 0x7f);
        if (!(buffer[index] & 0x80)) { values.push(value); value = 0; }
    }
    var head = values.shift();
    var first = head < 40 ? 0 : head < 80 ? 1 : 2;
    return [first, head - first * 40].concat(values).join(".");
}

function decode(input) {
    var buffer = Buffer.isBuffer(input) ? input : Buffer.from(input || "");
    if (!buffer.length) fail("The CSR file is empty.");
    if (buffer.length > MAX_CSR_BYTES) fail("The CSR file is larger than " + (MAX_CSR_BYTES / 1024) + " KB.");
    if (buffer[0] === 0x30) return buffer;
    var textValue = buffer.toString("utf8").replace(/^﻿/, "");
    if (/[\u0000�]/.test(textValue)) fail();
    var match = PEM_PATTERN.exec(textValue);
    if (!match) fail();
    var body = match[2].replace(/[\r\n]/g, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body) || body.length % 4 !== 0) fail();
    return Buffer.from(body, "base64");
}

// Returns { der, spki, pem, algorithm } or throws. Signature (proof of possession) is verified.
function parseCsr(input) {
    var der = decode(input);
    var outer = readTlv(der, 0, der.length);
    if (outer.tag !== 0x30 || outer.next !== der.length) fail();
    var parts = children(der, outer);
    if (parts.length !== 3 || parts[0].tag !== 0x30 || parts[1].tag !== 0x30 || parts[2].tag !== 0x03) fail();
    var info = children(der, parts[0]);
    if (info.length !== 4 || info[0].tag !== 0x02 || info[1].tag !== 0x30 || info[2].tag !== 0x30 || info[3].tag !== 0xA0) fail();
    if (info[0].end - info[0].start !== 1 || der[info[0].start] !== 0) fail("Unsupported CSR version.");
    var algorithm = oid(der, children(der, parts[1])[0]);
    if (algorithm === RSA_PSS || !Object.prototype.hasOwnProperty.call(SIGNATURE_ALGORITHMS, algorithm)) {
        fail("Unsupported CSR signature algorithm (" + algorithm + "). Use SHA-256 or stronger RSA/ECDSA, or Ed25519.");
    }
    var spki = der.subarray(info[2].offset, info[2].end);
    var key;
    try { key = crypto.createPublicKey({ key: spki, format: "der", type: "spki" }); }
    catch (error) { fail("The CSR public key is not supported."); }
    if (der[parts[2].start] !== 0) fail();
    var signature = der.subarray(parts[2].start + 1, parts[2].end);
    var signed = der.subarray(parts[0].offset, parts[0].end);
    var valid = false;
    try { valid = crypto.verify(SIGNATURE_ALGORITHMS[algorithm], signed, key, signature); }
    catch (error) { valid = false; }
    if (!valid) fail("The CSR signature is invalid.");
    var base64 = der.toString("base64").replace(/(.{64})/g, "$1\n").replace(/\n$/, "");
    return {
        der: Buffer.from(der),
        spki: Buffer.from(spki),
        algorithm: algorithm,
        pem: "-----BEGIN NEW CERTIFICATE REQUEST-----\r\n" + base64.replace(/\n/g, "\r\n") + "\r\n-----END NEW CERTIFICATE REQUEST-----\r\n"
    };
}

function certificateDer(input) {
    var buffer = Buffer.isBuffer(input) ? input : Buffer.from(input || "");
    if (buffer[0] === 0x30) return buffer;
    var match = /-----BEGIN CERTIFICATE-----([A-Za-z0-9+/=\s]+)-----END CERTIFICATE-----/.exec(buffer.toString("utf8"));
    if (!match) throw new Error("The CA response is not a certificate.");
    return Buffer.from(match[1].replace(/\s+/g, ""), "base64");
}

// Fail-closed check that the issued certificate belongs to the submitted CSR and the expected CA.
function verifyIssued(certificate, csr, expectedIssuerName) {
    if (typeof crypto.X509Certificate !== "function") throw new Error("Certificate verification is unavailable in this Node.js runtime.");
    var parsed;
    try { parsed = new crypto.X509Certificate(certificateDer(certificate)); }
    catch (error) { throw new Error("The CA response is not a valid certificate."); }
    var issued = parsed.publicKey.export({ type: "spki", format: "der" });
    if (!Buffer.from(issued).equals(csr.spki)) {
        throw new Error("The issued certificate does not match the CSR public key.");
    }
    var issuerName = String(expectedIssuerName || "").trim();
    if (issuerName) {
        var lines = String(parsed.issuer || "").split(/\r?\n/).map(function (line) { return line.trim(); });
        if (lines.indexOf("CN=" + issuerName) < 0) throw new Error("The certificate was not issued by the configured CA.");
    }
    return {
        der: Buffer.from(parsed.raw),
        serialNumber: String(parsed.serialNumber || ""),
        validTo: String(parsed.validTo || ""),
        fingerprint256: String(parsed.fingerprint256 || "")
    };
}

module.exports = {
    MAX_CSR_BYTES: MAX_CSR_BYTES,
    parseCsr: parseCsr,
    verifyIssued: verifyIssued
};
