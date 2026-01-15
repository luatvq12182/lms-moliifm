const ActivityLog = require("../models/ActivityLog");
const { getClientIp, getUserAgent, getReferer } = require("../utils/requestMeta");

// optional: parse UA
let UAParser = null;
try {
    UAParser = require("ua-parser-js");
} catch (_) {
    UAParser = null;
}

async function writeLog(req, action, extra = {}) {
    const u = req.user;

    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);
    const referer = getReferer(req);

    let ua = {};
    if (UAParser) {
        const parsed = new UAParser(userAgent).getResult();
        ua = {
            browser: parsed?.browser?.name || "",
            version: parsed?.browser?.version || "",
            os: parsed?.os?.name || "",
            device: parsed?.device?.model || parsed?.device?.type || "",
        };
    }

    // chỉ log khi đã có user (login thì mình log ở controller sau khi verify)
    return ActivityLog.create({
        action,
        userId: u?._id,
        userRole: u?.role,
        userEmail: u?.email,

        ip,
        userAgent,
        referer,
        path: req.originalUrl || "",
        method: req.method || "",

        ua,

        ...extra,
    });
}

module.exports = { writeLog };