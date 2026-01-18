const jwt = require("jsonwebtoken");

module.exports = function authQueryToken(req, res, next) {
    // ưu tiên Authorization header như thường
    const h = req.headers.authorization || "";
    if (h.startsWith("Bearer ")) {
        req._token = h.slice(7);
        return next();
    }

    // fallback: token trên query để <audio> dùng được
    const t = req.query.token;
    if (typeof t === "string" && t.length > 10) {
        req._token = t;
        return next();
    }

    return res.status(401).json({ message: "missing token" });
};