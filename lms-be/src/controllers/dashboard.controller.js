const Course = require("../models/Course");
const ClassModel = require("../models/Class");
const User = require("../models/User");
const Material = require("../models/Material");

async function getTeacherVisibleMaterialsQuery(teacherId) {
    // public
    const publicQ = { scope: "public" };

    // classes teacher được gán
    const myClassIds = await ClassModel.distinct("_id", { teacherIds: teacherId });
    const classQ = { scope: "class", classId: { $in: myClassIds } };

    // courses teacher dạy (ít nhất 1 class)
    const myCourseIds = await ClassModel.distinct("courseId", { teacherIds: teacherId });
    const courseQ = { scope: "course", courseId: { $in: myCourseIds } };

    return { $or: [publicQ, classQ, courseQ] };
}

async function getSummary(req, res) {
    const isAdmin = req.user.role === "admin";

    if (isAdmin) {
        const [courses, classes, teachers, materials] = await Promise.all([
            Course.countDocuments({}),
            ClassModel.countDocuments({}),
            User.countDocuments({ role: "teacher" }),
            Material.countDocuments({ isActive: true }),
        ]);

        const recentClasses = await ClassModel.find({})
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate("courseId", "name")
            .lean();

        const recentMaterials = await Material.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate("uploaderId", "name")
            .populate("courseId", "name")
            .populate("classId", "name")
            .lean();

        return res.json({
            counters: { courses, classes, teachers, materials },
            recentClasses: recentClasses.map((c) => ({
                _id: c._id,
                name: c.name,
                course: c.courseId ? { _id: c.courseId._id, name: c.courseId.name } : null,
                teachers: (c.teacherIds || []).length,
                updatedAt: c.updatedAt,
            })),
            recentMaterials: recentMaterials.map((m) => ({
                _id: m._id,
                title: m.title,
                scope: m.scope,
                uploader: m.uploaderId ? { name: m.uploaderId.name } : null,
                course: m.courseId ? { name: m.courseId.name } : null,
                class: m.classId ? { name: m.classId.name } : null,
                createdAt: m.createdAt,
            })),
        });
    }

    // teacher
    const myClasses = await ClassModel.find({ teacherIds: req.user._id })
        .sort({ updatedAt: -1 })
        .limit(8)
        .populate("courseId", "name")
        .lean();

    const visibleMaterialsQ = await getTeacherVisibleMaterialsQuery(req.user._id);

    const [materialsCount, recentMaterials] = await Promise.all([
        Material.countDocuments({ isActive: true, ...visibleMaterialsQ }),
        Material.find({ isActive: true, ...visibleMaterialsQ })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate("uploaderId", "name")
            .populate("courseId", "name")
            .populate("classId", "name")
            .lean(),
    ]);

    return res.json({
        counters: {
            myClasses: myClasses.length,
            materials: materialsCount,
        },
        myClasses: myClasses.map((c) => ({
            _id: c._id,
            name: c.name,
            course: c.courseId ? { _id: c.courseId._id, name: c.courseId.name } : null,
            updatedAt: c.updatedAt,
        })),
        recentMaterials: recentMaterials.map((m) => ({
            _id: m._id,
            title: m.title,
            scope: m.scope,
            uploader: m.uploaderId ? { name: m.uploaderId.name } : null,
            course: m.courseId ? { name: m.courseId.name } : null,
            class: m.classId ? { name: m.classId.name } : null,
            createdAt: m.createdAt,
        })),
    });
}

module.exports = { getSummary };