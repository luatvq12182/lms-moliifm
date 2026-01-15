function getClientIp(req) {
    // ưu tiên x-forwarded-for nếu bạn reverse proxy nginx
    const xff = req.headers["x-forwarded-for"];
    if (xff) return String(xff).split(",")[0].trim();
    return req.socket?.remoteAddress || req.ip || "";
}

function getUserAgent(req) {
    return req.headers["user-agent"] ? String(req.headers["user-agent"]) : "";
}

function getReferer(req) {
    return req.headers["referer"] ? String(req.headers["referer"]) : "";
}

module.exports = { getClientIp, getUserAgent, getReferer };