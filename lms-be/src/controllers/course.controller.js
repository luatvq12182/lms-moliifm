const Course = require("../models/Course");
const ClassModel = require("../models/Class");

function toIdString(x) {
    return x ? String(x) : "";
}

/**
 * GET /api/courses
 * - admin: thấy tất cả courses + classes
 * - teacher: chỉ thấy courses có class mà teacher đó được gán + chỉ các class của teacher đó
 * Response: [{ course, classes: [...] }]
 */
async function listCourses(req, res) {
    const isAdmin = req.user.role === "admin";
    const teacherId = req.user._id;

    let courseFilter = {};
    let classFilter = {};

    if (!isAdmin) {
        // teacher chỉ xem class của mình => lấy courseIds từ các class đó
        const myClasses = await ClassModel.find({ teacherIds: teacherId }).select("courseId");
        const courseIds = [...new Set(myClasses.map((c) => toIdString(c.courseId)))].filter(Boolean);

        courseFilter = { _id: { $in: courseIds } };
        classFilter = { teacherIds: teacherId };
    }

    const courses = await Course.find(courseFilter).sort({ createdAt: -1 });

    // lấy classes theo các course (admin) hoặc classes của teacher (teacher)
    const classes = await ClassModel.find({
        ...(Object.keys(classFilter).length ? classFilter : {}),
        courseId: { $in: courses.map((c) => c._id) },
    })
        .sort({ createdAt: -1 })
        .populate("teacherIds", "name email role");

    const byCourse = new Map();
    for (const cls of classes) {
        const key = toIdString(cls.courseId);
        if (!byCourse.has(key)) byCourse.set(key, []);
        byCourse.get(key).push({
            _id: cls._id,
            name: cls.name,
            isActive: cls.isActive,
            courseId: cls.courseId,
            teacherIds: cls.teacherIds, // populated
            createdAt: cls.createdAt,
            updatedAt: cls.updatedAt,
        });
    }

    const result = courses.map((c) => ({
        course: {
            _id: c._id,
            name: c.name,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        },
        classes: byCourse.get(toIdString(c._id)) || [],
    }));

    return res.json({ items: result });
}

// admin only
async function createCourse(req, res) {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ message: "name is required" });

    const course = await Course.create({ name: String(name).trim() });
    return res.status(201).json({ course });
}

// admin only
async function getCourse(req, res) {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "not found" });

    const classes = await ClassModel.find({ courseId: course._id })
        .sort({ createdAt: -1 })
        .populate("teacherIds", "name email role");

    return res.json({
        course,
        classes,
    });
}

// admin only
async function updateCourse(req, res) {
    const { name } = req.body || {};
    const patch = {};
    if (name) patch.name = String(name).trim();

    const course = await Course.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!course) return res.status(404).json({ message: "not found" });

    return res.json({ course });
}

// admin only
async function deleteCourse(req, res) {
    const courseId = req.params.id;

    // chặn xoá nếu còn lớp
    const count = await ClassModel.countDocuments({ courseId });
    if (count > 0) return res.status(409).json({ message: "course has classes, cannot delete" });

    const ok = await Course.findByIdAndDelete(courseId);
    if (!ok) return res.status(404).json({ message: "not found" });

    return res.json({ ok: true });
}

module.exports = {
    listCourses,
    createCourse,
    getCourse,
    updateCourse,
    deleteCourse,
};