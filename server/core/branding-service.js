"use strict";

var MAX_PROTOCOL_LOGO_BYTES = 1024 * 1024;
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

module.exports.createBrandingService = function (options) {
    options = options || {};
    var fs = options.fs;
    var path = options.path;
    var directory = path.join(options.dataRoot, "branding");
    var protocolLogoPath = path.join(directory, "protocol-logo.png");

    function validateProtocolLogo(buffer) {
        if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("Select a PNG logo file.");
        if (buffer.length > MAX_PROTOCOL_LOGO_BYTES) throw new Error("The PNG logo must not exceed 1 MB.");
        if (buffer.length < PNG_SIGNATURE.length || !buffer.slice(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
            throw new Error("The selected file is not a valid PNG image.");
        }
        return buffer;
    }

    function saveProtocolLogo(buffer) {
        validateProtocolLogo(buffer);
        fs.mkdirSync(directory, { recursive: true });
        var temporaryPath = protocolLogoPath + ".tmp-" + process.pid + "-" + Date.now();
        try {
            fs.writeFileSync(temporaryPath, buffer, { flag: "wx" });
            try { if (fs.existsSync(protocolLogoPath)) fs.unlinkSync(protocolLogoPath); } catch (error) {}
            fs.renameSync(temporaryPath, protocolLogoPath);
        } finally {
            try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch (error) {}
        }
        return { path: protocolLogoPath, size: buffer.length };
    }

    return {
        protocolLogoPath: protocolLogoPath,
        readProtocolLogo: function () { return fs.readFileSync(protocolLogoPath); },
        hasProtocolLogo: function () { return fs.existsSync(protocolLogoPath); },
        saveProtocolLogo: saveProtocolLogo,
        validateProtocolLogo: validateProtocolLogo
    };
};

module.exports.MAX_PROTOCOL_LOGO_BYTES = MAX_PROTOCOL_LOGO_BYTES;
