function requireSelfOrAdmin(paramKey = "id") {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: "unauthorized" });

        const targetId = req.params[paramKey];
        const isSelf = req.user._id.toString() === String(targetId);
        const isAdmin = req.user.role === "admin";

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ message: "forbidden" });
        }
        next();
    };
}

module.exports = requireSelfOrAdmin;