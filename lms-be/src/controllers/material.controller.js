const fs = require("fs");
const path = require("path");
const Material = require("../models/Material");
const ClassModel = require("../models/Class");
const Folder = require("../models/Folder");
const {
    uploadPptxAsGoogleSlides,
    setPermissionAnyoneReader,
} = require("../services/googleDrive.service");
const { getTeacherAccessIds } = require("../utils/access");
const { writeLog } = require("../services/activityLog.service");

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
    const { folderId, q } = req.query;

    const filter = { isActive: true };

    // ✅ mặc định root nếu không truyền folderId
    if (folderId && String(folderId).trim()) {
        filter.folderId = folderId;   // trong folder
    } else {
        filter.folderId = null;       // root
    }

    if (q && String(q).trim()) {
        const kw = String(q).trim();
        filter.$or = [
            { title: { $regex: kw, $options: "i" } },
            { originalName: { $regex: kw, $options: "i" } },
        ];
    }

    const items = await Material.find(filter).sort({ createdAt: -1 });

    return res.json({ items });
}

/**
 * POST /api/materials/upload (admin only)
 * body: scope (public|course|class), courseId?, classId?, title?
 * file: multipart "file"
 */
async function uploadMaterial(req, res) {
    const { title, folderId } = req.body || {};
    if (!req.file) return res.status(400).json({ message: "file is required" });

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "forbidden" });
    }

    let finalFolderId = folderId ? String(folderId) : null;
    if (finalFolderId) {
        const folder = await Folder.findOne({ _id: finalFolderId, isActive: true }).select("_id");
        if (!folder) return res.status(400).json({ message: "invalid folderId" });
    }

    const originalName = req.file.originalname;
    const slideName = String(title || originalName).trim();

    const { fileId, previewUrl, webViewLink } = await uploadPptxAsGoogleSlides({
        localPath: req.file.path,
        fileName: slideName,
    });

    fs.unlink(req.file.path, (err) => {
        if (err) console.error("Failed to remove local file:", err);
    });

    await setPermissionAnyoneReader(fileId);

    const doc = await Material.create({
        title: slideName,
        originalName,
        mimeType: req.file.mimetype,
        ext: "pptx",
        size: req.file.size,
        uploaderId: req.user._id,
        folderId: finalFolderId,
        isActive: true,
        provider: "google",
        google: { fileId, previewUrl, webViewLink },
    });

    const populated = await Material.findById(doc._id).populate("uploaderId", "name email role");
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

    // ✅ log teacher view
    if (req.user?.role === "teacher") {
        writeLog(req, "MATERIAL_VIEW", {
            materialId: m._id,
            folderId: m.folderId || null,
            meta: {
                title: m.title,
                originalName: m.originalName,
            },
        }).catch(() => { });
    }

    return res.json({ previewUrl: m.google?.previewUrl });
}

function buildMaterialPermissionFilter(user, access) {
    if (user.role === "admin") return { isActive: true };

    return {
        isActive: true,
        $or: [
            { scope: "public" },
            { scope: "course", courseId: { $in: access.allowedCourseIds } },
            { scope: "class", classId: { $in: access.allowedClassIds } },
        ],
    };
}

module.exports = {
    listMaterials,
    uploadMaterial,
    downloadFile,
    updateMaterial,
    deleteMaterial,
    getEmbed
};