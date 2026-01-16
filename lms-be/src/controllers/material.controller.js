const fs = require("fs");
const path = require("path");
const { canAccessMaterial } = require("../utils/acl");
const Material = require("../models/Material");
const ClassModel = require("../models/Class");
const Folder = require("../models/Folder");
const {
    uploadPptxAsGoogleSlides,
    setPermissionAnyoneReader,
    uploadDocxAsGoogleDocs,
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
    const isAdmin = req.user.role === "admin";
    const { folderId = "" } = req.query;

    // ✅ bắt buộc filter theo folderId
    const filter = {
        isActive: true,
        folderId: folderId ? folderId : null,
    };

    if (isAdmin) {
        const items = await Material.find(filter).sort({ createdAt: -1 });
        return res.json({ items });
    }

    const items = await Material.find({
        ...filter,
        $or: [
            { visibility: "public" },
            { visibility: "restricted", allowTeacherIds: req.user._id },
        ],
    }).sort({ createdAt: -1 });

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
    if (req.user.role !== "admin") return res.status(403).json({ message: "forbidden" });

    const originalName = req.file.originalname;
    const fileName = String(title || originalName).trim();

    const ext = (() => {
        const parts = String(originalName || "").split(".");
        return parts.length > 1 ? parts.pop().toLowerCase() : "";
    })();

    // lấy quyền kế thừa từ folder (như bạn đã làm)
    let finalFolderId = folderId ? String(folderId) : null;
    let visibility = "public";
    let allowTeacherIds = [];
    if (finalFolderId) {
        const folder = await Folder.findOne({ _id: finalFolderId, isActive: true }).select("_id visibility allowTeacherIds");
        if (!folder) return res.status(400).json({ message: "invalid folderId" });
        visibility = folder.visibility || "public";
        allowTeacherIds = Array.isArray(folder.allowTeacherIds) ? folder.allowTeacherIds : [];
    }

    let googleMeta = null;

    if (ext === "pptx" || ext === "ppt") {
        const { fileId, previewUrl, webViewLink } = await uploadPptxAsGoogleSlides({
            localPath: req.file.path,
            fileName,
        });
        await setPermissionAnyoneReader(fileId);
        googleMeta = { fileId, previewUrl, webViewLink, kind: "slides" };
    } else if (ext === "docx" || ext === "doc") {
        const { fileId, previewUrl, webViewLink } = await uploadDocxAsGoogleDocs({
            localPath: req.file.path,
            fileName,
        });
        await setPermissionAnyoneReader(fileId);
        googleMeta = { fileId, previewUrl, webViewLink, kind: "docs" };
    } else {
        return res.status(400).json({ message: "only pptx/docx supported for now" });
    }

    // xoá file local
    fs.unlink(req.file.path, (err) => err && console.error("Failed to remove local file:", err));

    const doc = await Material.create({
        title: fileName,
        originalName,
        mimeType: req.file.mimetype,
        ext,
        size: req.file.size,
        uploaderId: req.user._id,
        folderId: finalFolderId,
        visibility,
        allowTeacherIds,
        isActive: true,
        provider: "google",
        google: {
            fileId: googleMeta.fileId,
            previewUrl: googleMeta.previewUrl,
            webViewLink: googleMeta.webViewLink,
            kind: googleMeta.kind, // 'slides' | 'docs'
        },
        storagePath: "", // nếu schema còn required thì để tạm, tốt nhất bỏ required
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
    // .populate("classId", "name")
    // .populate("courseId", "name");

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
    const ok = await canAccessMaterial(req.user, req.params.id);
    if (!ok) return res.status(403).json({ message: "forbidden" });

    const doc = await Material.findById(req.params.id);
    if (!doc || !doc.isActive)
        return res.status(404).json({ message: "not found" });

    const g = doc.google || {};
    const fileId = g.fileId;

    let previewUrl = g.previewUrl || "";

    // slides => embed minimal
    if (g.kind === "slides" && fileId) {
        previewUrl = `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
    }

    // docs => preview
    if (g.kind === "docs" && fileId) {
        previewUrl = `https://docs.google.com/document/d/${fileId}/preview`;
    }

    // ✅ log MATERIAL_VIEW (đừng để log làm fail request)
    try {
        await writeLog(req, "MATERIAL_VIEW", {
            materialId: doc._id,
            folderId: doc.folderId || null,
            meta: {
                title: doc.title || "",
                originalName: doc.originalName || "",
                ext: doc.ext || "",
                provider: doc.provider || "",
                kind: g.kind || "",
                googleFileId: fileId || "",
            },
        });
    } catch (e) {
        console.error("writeLog MATERIAL_VIEW failed:", e?.message || e);
    }

    return res.json({ previewUrl });
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

async function patchMaterialPermissions(req, res) {
    if (req.user.role !== "admin")
        return res.status(403).json({ message: "admin only" });

    const { visibility, allowTeacherIds } = req.body || {};
    if (!["public", "restricted"].includes(visibility))
        return res.status(400).json({ message: "invalid visibility" });

    const doc = await Material.findById(req.params.id);
    if (!doc || !doc.isActive) return res.status(404).json({ message: "not found" });

    doc.visibility = visibility;
    doc.allowTeacherIds = visibility === "restricted" ? (allowTeacherIds || []) : [];
    await doc.save();

    return res.json({ material: doc });
}

function extFromName(originalName = "") {
    const parts = String(originalName).split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

async function resolveFolderPermission(folderId) {
    let visibility = "public";
    let allowTeacherIds = [];

    if (!folderId) return { folderId: null, visibility, allowTeacherIds };

    const folder = await Folder.findOne({ _id: folderId, isActive: true })
        .select("_id visibility allowTeacherIds");
    if (!folder) throw Object.assign(new Error("invalid folderId"), { status: 400 });

    visibility = folder.visibility || "public";
    allowTeacherIds = Array.isArray(folder.allowTeacherIds) ? folder.allowTeacherIds : [];
    return { folderId: String(folder._id), visibility, allowTeacherIds };
}

async function uploadManyMaterials(req, res) {
    if (req.user.role !== "admin") return res.status(403).json({ message: "forbidden" });

    const { folderId } = req.body || {};
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "files is required" });

    // titles có thể gửi dạng JSON string: ["Tên 1", "Tên 2", ...]
    let titles = [];
    try {
        if (req.body?.titles) titles = JSON.parse(req.body.titles);
    } catch (_) {
        titles = [];
    }

    const { folderId: finalFolderId, visibility, allowTeacherIds } =
        await resolveFolderPermission(folderId ? String(folderId) : null);

    const created = [];
    const failed = [];

    // ⚠️ convert/upload google nên chạy tuần tự để tránh quota/timeout
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        try {
            const originalName = f.originalname;
            const displayTitle = String(titles?.[i] || originalName).trim();

            // hiện tại bạn đang “pptx -> google slides”, docx bạn sẽ làm sau
            const { fileId, previewUrl, webViewLink } = await uploadPptxAsGoogleSlides({
                localPath: f.path,
                fileName: displayTitle,
            });

            fs.unlink(f.path, () => { });

            await setPermissionAnyoneReader(fileId);

            const doc = await Material.create({
                title: displayTitle,
                originalName,
                mimeType: f.mimetype,
                ext: extFromName(originalName) || "pptx",
                size: f.size,
                uploaderId: req.user._id,
                folderId: finalFolderId,

                visibility,
                allowTeacherIds,

                isActive: true,
                provider: "google",
                google: { fileId, previewUrl, webViewLink },

                storagePath: "", // nếu schema còn required
            });

            created.push(doc);
        } catch (err) {
            // file lỗi thì vẫn xoá local
            try { fs.unlink(f.path, () => { }); } catch (_) { }
            failed.push({ originalName: f.originalname, message: err?.message || "failed" });
        }
    }

    return res.status(201).json({
        createdCount: created.length,
        failedCount: failed.length,
        failed,
    });
};

module.exports = {
    listMaterials,
    uploadMaterial,
    downloadFile,
    updateMaterial,
    uploadManyMaterials,
    deleteMaterial,
    getEmbed,
    patchMaterialPermissions
};