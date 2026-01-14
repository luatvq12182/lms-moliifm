const User = require("../models/User");
const { signToken } = require("../utils/jwt");

async function login(req, res) {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.isActive) {
        return res.status(401).json({ message: "invalid credentials" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });

    const token = signToken(user, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.json({ token, user: user.toSafeJSON() });
}

/**
 * bootstrap admin lần đầu (để khỏi phải tạo tay trong DB)
 * gọi 1 lần rồi có thể tắt endpoint này sau.
 */
async function bootstrapAdmin(req, res) {
    const { key, name, email, password } = req.body || {};
    if (!key || key !== process.env.ADMIN_BOOTSTRAP_KEY) {
        return res.status(403).json({ message: "invalid bootstrap key" });
    }

    const existsAdmin = await User.findOne({ role: "admin" });
    if (existsAdmin) {
        return res.status(409).json({ message: "admin already exists" });
    }

    if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email, password are required" });
    }

    const passwordHash = await User.hashPassword(password);

    const admin = await User.create({
        name,
        email: String(email).toLowerCase().trim(),
        passwordHash,
        role: "admin",
        isActive: true,
    });

    return res.status(201).json({ user: admin.toSafeJSON() });
}

module.exports = { login, bootstrapAdmin };