const User = require("../models/User");

async function getMe(req, res) {
    return res.json({ user: req.user.toSafeJSON() });
}

async function updateMe(req, res) {
    // teacher chỉ sửa tài khoản của họ => dùng endpoint /me
    const { name, password } = req.body || {};
    const patch = {};

    if (name) patch.name = String(name).trim();
    if (password) patch.passwordHash = await User.hashPassword(password);

    const updated = await User.findByIdAndUpdate(req.user._id, patch, { new: true });
    return res.json({ user: updated.toSafeJSON() });
}

// admin
async function adminCreateUser(req, res) {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email, password are required" });
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        passwordHash,
        role: role === "admin" ? "admin" : "teacher",
        isActive: true,
    });

    return res.status(201).json({ user: user.toSafeJSON() });
}

async function adminListUsers(req, res) {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json({ users: users.map((u) => u.toSafeJSON()) });
}

async function adminGetUser(req, res) {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "not found" });
    return res.json({ user: user.toSafeJSON() });
}

/**
 * PATCH /users/:id
 * admin: sửa ai cũng được
 * teacher: chỉ sửa chính họ (nhưng role/email không cho sửa)
 */
async function updateUser(req, res) {
    const { name, password, isActive, role } = req.body || {};
    const patch = {};

    if (name) patch.name = String(name).trim();
    if (password) patch.passwordHash = await User.hashPassword(password);

    // chỉ admin mới được đổi isActive/role
    if (req.user.role === "admin") {
        if (typeof isActive === "boolean") patch.isActive = isActive;
        if (role === "admin" || role === "teacher") patch.role = role;
    }

    const updated = await User.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!updated) return res.status(404).json({ message: "not found" });

    return res.json({ user: updated.toSafeJSON() });
}

module.exports = {
    getMe,
    updateMe,
    adminCreateUser,
    adminListUsers,
    adminGetUser,
    updateUser,
};