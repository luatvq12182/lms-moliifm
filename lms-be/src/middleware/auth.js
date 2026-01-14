const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({ message: "missing token" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.sub);

        if (!user || !user.isActive) {
            return res.status(401).json({ message: "user not found or inactive" });
        }

        req.user = user; // full user doc
        req.auth = payload; // {sub, role}
        next();
    } catch (err) {
        return res.status(401).json({ message: "invalid token" });
    }
}

module.exports = auth;