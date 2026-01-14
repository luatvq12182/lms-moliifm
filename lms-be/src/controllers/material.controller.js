const fs = require("fs");
const path = require("path");
const Material = require("../models/Material");
const ClassModel = require("../models/Class");
const Course = require("../models/Course");
const {
    uploadPptxAsGoogleSlides,
    setPermissionAnyoneReader,
} = require("../services/googleDrive.service");

function pickExt(filename) {
    return path.extname(filename || "").replace(".", "").toLowerCase();
}

// helper: teacher có thuộc course không (bằng việc dạy 1 class trong course)
async function teacherHasCourseAccess(teacherId, courseId) {
    const count = await ClassModel.countDocuments({
        courseId,
        teacherIds: teacherId,
    });
    return count > 0;
}

// helper: teacher có thuộc class không
async function teacherHasClassAccess(teacherId, classId) {
    const cls = await ClassModel.findById(classId).select("teacherIds");
    if (!cls) return false;
    return (cls.teacherIds || []).some((t) => String(t) === String(teacherId));
}

async function listMaterials(req, res) {
    const isAdmin = req.user.role === "admin";
    const { scope, classId, courseId } = req.query;

    const filter = { isActive: true };
    if (scope) filter.scope = scope;
    if (classId) filter.classId = classId;
    if (courseId) filter.courseId = courseId;

    let items = [];

    if (isAdmin) {
        items = await Material.find(filter)
            .sort({ createdAt: -1 })
            .populate("uploaderId", "name email role")
            .populate("classId", "name")
            .populate("courseId", "name");
    } else {
        // teacher: public OR (course match) OR (class match)
        // 1) public
        const publicItems = await Material.find({ ...filter, scope: "public" })
            .sort({ createdAt: -1 })
            .populate("uploaderId", "name email role")
            .populate("classId", "name")
            .populate("courseId", "name");

        // 2) course: courseId thuộc các course teacher có ít nhất 1 lớp
        const myCourseIds = await ClassModel.distinct("courseId", { teacherIds: req.user._id });
        const courseItems = await Material.find({
            ...filter,
            scope: "course",
            courseId: { $in: myCourseIds },
        })
            .sort({ createdAt: -1 })
            .populate("uploaderId", "name email role")
            .populate("classId", "name")
            .populate("courseId", "name");

        // 3) class: classId thuộc các lớp teacher được gán
        const myClassIds = await ClassModel.distinct("_id", { teacherIds: req.user._id });
        const classItems = await Material.find({
            ...filter,
            scope: "class",
            classId: { $in: myClassIds },
        })
            .sort({ createdAt: -1 })
            .populate("uploaderId", "name email role")
            .populate("classId", "name")
            .populate("courseId", "name");

        // merge + unique
        const map = new Map();
        [...publicItems, ...courseItems, ...classItems].forEach((x) => map.set(String(x._id), x));
        items = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json({
        items: items.map((m) => ({
            _id: m._id,
            title: m.title,
            originalName: m.originalName,
            mimeType: m.mimeType,
            ext: m.ext,
            size: m.size,
            scope: m.scope,
            isActive: m.isActive,
            createdAt: m.createdAt,
            uploader: m.uploaderId,
            class: m.classId,
            course: m.courseId,
        })),
    });
}

/**
 * POST /api/materials/upload (admin only)
 * body: scope (public|course|class), courseId?, classId?, title?
 * file: multipart "file"
 */
async function uploadMaterial(req, res) {
    const { scope = "class", title, courseId, classId } = req.body || {};
    if (!req.file) return res.status(400).json({ message: "file is required" });

    if (!["public", "course", "class"].includes(scope)) {
        return res.status(400).json({ message: "invalid scope" });
    }

    let finalCourseId = null;
    let finalClassId = null;

    if (scope === "course") {
        if (!courseId) return res.status(400).json({ message: "courseId is required" });
        const c = await Course.findById(courseId);
        if (!c) return res.status(400).json({ message: "invalid courseId" });
        finalCourseId = c._id;
    }

    if (scope === "class") {
        if (!classId) return res.status(400).json({ message: "classId is required" });
        const cls = await ClassModel.findById(classId).select("_id courseId");
        if (!cls) return res.status(400).json({ message: "invalid classId" });
        finalClassId = cls._id;
        finalCourseId = cls.courseId;
    }

    // ✅ upload+convert -> Google Slides
    const originalName = req.file.originalname;
    const slideName = String(title || originalName).trim();

    const { fileId, previewUrl, webViewLink } = await uploadPptxAsGoogleSlides({
        localPath: req.file.path,
        fileName: slideName,
    });

    fs.unlink(req.file.path, (err) => {
        if (err) {
            console.error("Failed to remove local file:", err);
        }
    });

    // ✅ permission (bản tối giản để iframe xem được)
    // - public: anyone reader
    // - course/class: vẫn cần anyone reader để iframe hoạt động nếu giáo viên không login Google
    // (Nếu bạn dùng Workspace domain thì đổi sang domain reader)
    await setPermissionAnyoneReader(fileId);

    const doc = await Material.create({
        title: slideName,
        originalName,
        mimeType: req.file.mimetype,
        ext: "pptx",
        size: req.file.size,
        storagePath: req.file.path, // lưu lại local path (tuỳ bạn muốn xoá sau)
        uploaderId: req.user._id,
        scope,
        courseId: finalCourseId,
        classId: finalClassId,
        isActive: true,

        provider: "google",
        google: { fileId, previewUrl, webViewLink },
    });

    const populated = await Material.findById(doc._id)
        .populate("uploaderId", "name email role")
        .populate("classId", "name")
        .populate("courseId", "name");

    return res.status(201).json({ material: populated });
}

async function downloadFile(req, res) {
    const m = await Material.findById(req.params.id);
    if (!m || !m.isActive) return res.status(404).json({ message: "not found" });

    if (req.user.role !== "admin") {
        if (m.scope === "public") {
            // ok
        } else if (m.scope === "course") {
            const ok = await teacherHasCourseAccess(req.user._id, m.courseId);
            if (!ok) return res.status(403).json({ message: "forbidden" });
        } else if (m.scope === "class") {
            const ok = await teacherHasClassAccess(req.user._id, m.classId);
            if (!ok) return res.status(403).json({ message: "forbidden" });
        }
    }

    return res.download(m.storagePath, m.originalName);
}

async function updateMaterial(req, res) {
    const { title, isActive, scope, courseId, classId } = req.body || {};
    const patch = {};

    if (title) patch.title = String(title).trim();
    if (typeof isActive === "boolean") patch.isActive = isActive;

    if (scope) {
        if (!["public", "course", "class"].includes(scope)) {
            return res.status(400).json({ message: "invalid scope" });
        }
        patch.scope = scope;

        if (scope === "public") {
            patch.courseId = null;
            patch.classId = null;
        }

        if (scope === "course") {
            if (!courseId) return res.status(400).json({ message: "courseId is required" });
            patch.courseId = courseId;
            patch.classId = null;
        }

        if (scope === "class") {
            if (!classId) return res.status(400).json({ message: "classId is required" });
            const cls = await ClassModel.findById(classId).select("courseId");
            if (!cls) return res.status(400).json({ message: "invalid classId" });
            patch.classId = classId;
            patch.courseId = cls.courseId;
        }
    }

    const updated = await Material.findByIdAndUpdate(req.params.id, patch, { new: true })
        .populate("uploaderId", "name email role")
        .populate("classId", "name")
        .populate("courseId", "name");

    if (!updated) return res.status(404).json({ message: "not found" });
    return res.json({ material: updated });
}

async function deleteMaterial(req, res) {
    const m = await Material.findById(req.params.id);
    if (!m) return res.status(404).json({ message: "not found" });

    await Material.findByIdAndUpdate(m._id, { isActive: false }, { new: true });
    return res.json({ ok: true });
}

async function getEmbed(req, res) {
    const m = await Material.findById(req.params.id);
    if (!m || !m.isActive) return res.status(404).json({ message: "not found" });

    // chỉ hỗ trợ google provider
    const url = m.google?.previewUrl;
    if (!url) return res.status(400).json({ message: "material has no previewUrl" });

    // ✅ admin luôn được xem
    if (req.user.role === "admin") {
        return res.json({ previewUrl: url });
    }

    // ✅ teacher: check theo scope
    if (m.scope === "public") {
        return res.json({ previewUrl: url });
    }

    if (m.scope === "course") {
        const ok = await teacherHasCourseAccess(req.user._id, m.courseId);
        if (!ok) return res.status(403).json({ message: "forbidden" });
        return res.json({ previewUrl: url });
    }

    if (m.scope === "class") {
        const ok = await teacherHasClassAccess(req.user._id, m.classId);
        if (!ok) return res.status(403).json({ message: "forbidden" });
        return res.json({ previewUrl: url });
    }

    return res.status(403).json({ message: "forbidden" });
}

module.exports = {
    listMaterials,
    uploadMaterial,
    downloadFile,
    updateMaterial,
    deleteMaterial,
    getEmbed
};