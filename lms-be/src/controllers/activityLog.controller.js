const ActivityLog = require("../models/ActivityLog");

async function listLogs(req, res) {
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin) return res.status(403).json({ message: "forbidden" });

    const {
        action,
        userId,
        materialId,
        q,
        from,
        to,
        page = 1,
        limit = 30,
    } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (materialId) filter.materialId = materialId;

    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
    }

    if (q && String(q).trim()) {
        const kw = String(q).trim();
        filter.$or = [
            { userEmail: { $regex: kw, $options: "i" } },
            { ip: { $regex: kw, $options: "i" } },
            { userAgent: { $regex: kw, $options: "i" } },
            { "meta.title": { $regex: kw, $options: "i" } },
        ];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
        ActivityLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .populate("userId", "name email role avatarUrl")
            .populate("materialId", "title originalName")
            .lean(),
        ActivityLog.countDocuments(filter),
    ]);

    return res.json({
        page: p,
        limit: l,
        total,
        items,
    });
}

module.exports = { listLogs };