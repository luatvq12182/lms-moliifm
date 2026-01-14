const ClassModel = require("../models/Class");
const Course = require("../models/Course");
const User = require("../models/User");

function isAssignedTeacher(userId, cls) {
    return (cls.teacherIds || []).some((t) => String(t) === String(userId));
}

/**
 * GET /api/classes
 * - admin: list all classes
 * - teacher: list classes where teacherIds includes self
 */
async function listClasses(req, res) {
    const isAdmin = req.user.role === "admin";
    const filter = isAdmin ? {} : { teacherIds: req.user._id };

    const classes = await ClassModel.find(filter)
        .sort({ createdAt: -1 })
        .populate("courseId", "name")
        .populate("teacherIds", "name email role");

    return res.json({
        items: classes.map((c) => ({
            _id: c._id,
            name: c.name,
            isActive: c.isActive,
            course: c.courseId, // populated { _id, name }
            teachers: c.teacherIds, // populated
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        })),
    });
}

/**
 * GET /api/classes/:id
 * - admin: ok
 * - teacher: only if assigned
 */
async function getClass(req, res) {
    const cls = await ClassModel.findById(req.params.id)
        .populate("courseId", "name")
        .populate("teacherIds", "name email role");

    if (!cls) return res.status(404).json({ message: "not found" });

    if (req.user.role !== "admin") {
        // cls.teacherIds is populated => object; check by _id
        const ok = (cls.teacherIds || []).some((t) => String(t._id) === String(req.user._id));
        if (!ok) return res.status(403).json({ message: "forbidden" });
    }

    return res.json({
        class: {
            _id: cls._id,
            name: cls.name,
            isActive: cls.isActive,
            course: cls.courseId,
            teachers: cls.teacherIds,
            createdAt: cls.createdAt,
            updatedAt: cls.updatedAt,
        },
    });
}

// admin only
async function createClass(req, res) {
    const { name, courseId, teacherIds } = req.body || {};
    if (!name || !courseId) return res.status(400).json({ message: "name and courseId are required" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(400).json({ message: "invalid courseId" });

    let validTeacherIds = [];
    if (Array.isArray(teacherIds) && teacherIds.length) {
        // chỉ cho add user role teacher/admin đều được? yêu cầu là add teacher => check role teacher
        const teachers = await User.find({ _id: { $in: teacherIds }, role: "teacher" }).select("_id");
        validTeacherIds = teachers.map((t) => t._id);
    }

    const cls = await ClassModel.create({
        name: String(name).trim(),
        courseId,
        teacherIds: validTeacherIds,
        isActive: true,
    });

    const populated = await ClassModel.findById(cls._id)
        .populate("courseId", "name")
        .populate("teacherIds", "name email role");

    return res.status(201).json({ class: populated });
}

// admin only
async function updateClass(req, res) {
    const { name, courseId, teacherIds, isActive } = req.body || {};
    const patch = {};

    if (name) patch.name = String(name).trim();
    if (typeof isActive === "boolean") patch.isActive = isActive;

    if (courseId) {
        const course = await Course.findById(courseId);
        if (!course) return res.status(400).json({ message: "invalid courseId" });
        patch.courseId = courseId;
    }

    if (Array.isArray(teacherIds)) {
        const teachers = await User.find({ _id: { $in: teacherIds }, role: "teacher" }).select("_id");
        patch.teacherIds = teachers.map((t) => t._id);
    }

    const updated = await ClassModel.findByIdAndUpdate(req.params.id, patch, { new: true })
        .populate("courseId", "name")
        .populate("teacherIds", "name email role");

    if (!updated) return res.status(404).json({ message: "not found" });

    return res.json({ class: updated });
}

// admin only
async function deleteClass(req, res) {
    const ok = await ClassModel.findByIdAndDelete(req.params.id);
    if (!ok) return res.status(404).json({ message: "not found" });
    return res.json({ ok: true });
}

module.exports = {
    listClasses,
    getClass,
    createClass,
    updateClass,
    deleteClass,
};