const ClassModel = require("../models/Class");

async function canAccessClass(req, res, next) {
    const classId = req.body.classId || req.params.classId || req.params.id || req.query.classId;
    if (!classId) return res.status(400).json({ message: "classId is required" });

    const cls = await ClassModel.findById(classId).select("teacherIds courseId");
    if (!cls) return res.status(404).json({ message: "class not found" });

    req.targetClass = cls;

    if (req.user.role === "admin") return next();

    const ok = (cls.teacherIds || []).some((t) => String(t) === String(req.user._id));
    if (!ok) return res.status(403).json({ message: "forbidden" });

    next();
}

module.exports = canAccessClass;