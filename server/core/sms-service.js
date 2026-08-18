"use strict";

var httpClient = require("./http-client.js");
var shared = require("./shared.js");

function text(value, limit) { return shared.cleanText(value == null ? "" : value, limit || 4000).trim(); }

function normalizeNumbers(value) {
    var source = Array.isArray(value) ? value : String(value || "").split(/[;,\s]+/);
    var seen = Object.create(null);
    return source.map(function (item) { return String(item || "").replace(/[^0-9+]/g, "").replace(/^\+/, ""); }).filter(function (number) {
        if (!/^[1-9][0-9]{8,14}$/.test(number) || seen[number]) return false;
        seen[number] = true; return true;
    }).slice(0, 100);
}

function masked(number) { return String(number || "").replace(/.(?=.{4})/g, "*"); }

module.exports.createSmsService = function (options) {
    options = options || {};
    var integrations = options.integrations;
    var requestJson = options.requestJson || httpClient.requestJson;

    function config() {
        var value = integrations.get("sms") || {};
        var endpoint = new URL(String(value.url || "https://api.smsapi.pl"));
        if (endpoint.protocol !== "https:") throw new Error("SMSAPI URL must use HTTPS.");
        if (!value.token) throw new Error("SMSAPI token is not configured.");
        value.url = endpoint.href.replace(/\/$/, "");
        return value;
    }

    function send(kind, recipients, message, sendOptions) {
        kind = String(kind || "sms").toLowerCase();
        if (kind !== "sms" && kind !== "vms") return Promise.reject(new Error("Unsupported message type."));
        var numbers = normalizeNumbers(recipients);
        var bodyText = text(message, kind === "sms" ? 1530 : 4000);
        if (!numbers.length) return Promise.reject(new Error("Provide at least one valid phone number."));
        if (!bodyText) return Promise.reject(new Error("Message is required."));
        var value = config();
        var params = new URLSearchParams();
        params.set("to", numbers.join(","));
        params.set(kind === "vms" ? "tts" : "message", bodyText);
        params.set("format", "json");
        if (kind === "sms") params.set("encoding", "utf-8");
        if (kind === "sms" && value.sender) params.set("from", text(value.sender, 11));
        if (kind === "vms") {
            var lector = text(sendOptions && sendOptions.lector || value.vmsLector || "ewa", 20).toLowerCase();
            if (["agnieszka", "ewa", "jacek", "jan", "maja"].indexOf(lector) < 0) return Promise.reject(new Error("Unsupported Voice SMS lector."));
            params.set("tts_lector", lector);
        }
        return requestJson({
            url: value.url + (kind === "vms" ? "/vms.do" : "/sms.do"),
            method: "POST",
            headers: { Authorization: "Bearer " + value.token, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: params.toString(), verifyTls: value.verifyTls !== false,
            timeoutMs: 30000, maxBytes: 2 * 1024 * 1024, errorPrefix: kind === "vms" ? "SMSAPI VMS" : "SMSAPI SMS"
        }).then(function (response) {
            if (response && response.error) throw new Error(text(response.message || response.error, 1000));
            var list = Array.isArray(response && response.list) ? response.list : [];
            return { kind: kind, count: list.length || Number(response && response.count) || numbers.length, recipients: numbers.map(masked), messages: list.map(function (item) {
                return { id: text(item.id, 100), number: masked(text(item.number || item.submitted_number, 30)), status: text(item.status, 50) };
            }) };
        });
    }

    return { normalizeNumbers: normalizeNumbers, send: send };
};
