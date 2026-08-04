"use strict";

var DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

function responseId(command) {
    return String(command && (command.responseid || command.responseId) || "");
}

function createBusyError(active) {
    var error = new Error(
        "Another SIRK command is already running on this device. " +
        "Wait for its result before starting the next command."
    );
    error.code = "SIRK_AGENT_COMMAND_BUSY";
    error.responseId = active && active.responseId || "";
    return error;
}

function apply(plugin, options) {
    options = options || {};
    var runtime = plugin && plugin.runtime;
    var device = runtime && runtime.context && runtime.context.device;
    if (!device || typeof device.sendRunCommands !== "function" || device.__sirkAgentCommandGuard) return;

    var timeoutMs = Math.max(30000, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
    var activeByNode = Object.create(null);
    var nodeByResponse = Object.create(null);
    var originalSend = device.sendRunCommands;
    var originalCapture = typeof runtime.captureAgentData === "function"
        ? runtime.captureAgentData
        : function () {};

    function clearByNode(nodeId, expectedResponseId) {
        nodeId = String(nodeId || "");
        var active = activeByNode[nodeId];
        if (!active) return false;
        if (expectedResponseId && String(active.responseId) !== String(expectedResponseId)) return false;

        if (active.timer) clearTimeout(active.timer);
        delete activeByNode[nodeId];
        if (active.responseId) delete nodeByResponse[active.responseId];
        return true;
    }

    function clearByResponse(id) {
        id = String(id || "");
        if (!id) return false;
        var nodeId = nodeByResponse[id];
        return nodeId ? clearByNode(nodeId, id) : false;
    }

    function stale(active) {
        return !active || Number(active.expiresAt) <= Date.now();
    }

    device.sendRunCommands = function (context, command, id, sessionId) {
        var nodeId = String(context && context.nodeId || "");
        var commandId = String(id || "");
        var active = activeByNode[nodeId];

        if (active && stale(active)) {
            clearByNode(nodeId, active.responseId);
            active = null;
        }
        if (nodeId && active) return Promise.reject(createBusyError(active));

        if (nodeId) {
            var record = {
                nodeId: nodeId,
                responseId: commandId,
                expiresAt: Date.now() + timeoutMs,
                timer: null
            };
            record.timer = setTimeout(function () {
                clearByNode(nodeId, commandId);
            }, timeoutMs);
            if (record.timer && typeof record.timer.unref === "function") record.timer.unref();
            activeByNode[nodeId] = record;
            if (commandId) nodeByResponse[commandId] = nodeId;
        }

        var operation;
        try {
            operation = originalSend.call(device, context, command, id, sessionId);
        } catch (error) {
            clearByNode(nodeId, commandId);
            throw error;
        }

        return Promise.resolve(operation).catch(function (error) {
            clearByNode(nodeId, commandId);
            throw error;
        });
    };

    runtime.captureAgentData = function (command, agent) {
        var id = responseId(command);
        if (id) clearByResponse(id);
        return originalCapture.call(runtime, command, agent);
    };

    device.__sirkAgentCommandGuard = {
        activeByNode: activeByNode,
        clearByNode: clearByNode,
        clearByResponse: clearByResponse,
        timeoutMs: timeoutMs
    };
}

module.exports.apply = apply;
module.exports.createBusyError = createBusyError;
module.exports.responseId = responseId;
