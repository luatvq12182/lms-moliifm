const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { canAccessMaterial } = require("../utils/acl");
const Material = require("../models/Material");
const ClassModel = require("../models/Class");
const Folder = require("../models/Folder");
const {
    uploadPptxAsGoogleSlides,
    setPermissionAnyoneReader,
    uploadDocxAsGoogleDocs,
    getSlides,
    uploadAudioToDrive,
} = require("../services/googleDrive.service");
// const { getTeacherAccessIds } = require("../utils/access");
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
    if (req.user.role !== "admin")
        return res.status(403).json({ message: "forbidden" });

    const originalName = req.file.originalname;
    const fileName = String(title || originalName).trim();

    const ext = (() => {
        const parts = String(originalName || "").split(".");
        return parts.length > 1 ? parts.pop().toLowerCase() : "";
    })();

    // lấy quyền kế thừa từ folder
    let finalFolderId = folderId ? String(folderId) : null;
    let visibility = "public";
    let allowTeacherIds = [];
    if (finalFolderId) {
        const folder = await Folder.findOne({
            _id: finalFolderId,
            isActive: true,
        }).select("_id visibility allowTeacherIds");
        if (!folder) return res.status(400).json({ message: "invalid folderId" });
        visibility = folder.visibility || "public";
        allowTeacherIds = Array.isArray(folder.allowTeacherIds)
            ? folder.allowTeacherIds
            : [];
    }

    let provider = "google";
    let googleMeta = null;
    let storagePath = "";

    try {
        if (ext === "pptx" || ext === "ppt") {
            const { fileId, previewUrl, webViewLink } =
                await uploadPptxAsGoogleSlides({
                    localPath: req.file.path,
                    fileName,
                });

            await setPermissionAnyoneReader(fileId);
            googleMeta = { fileId, previewUrl, webViewLink, kind: "slides" };
        } else if (ext === "docx" || ext === "doc") {
            const { fileId, previewUrl, webViewLink } =
                await uploadDocxAsGoogleDocs({
                    localPath: req.file.path,
                    fileName,
                });

            await setPermissionAnyoneReader(fileId);
            googleMeta = { fileId, previewUrl, webViewLink, kind: "docs" };
        } else if (ext === "mp3" || ext === "wav" || ext === "m4a" || ext === "ogg") {
            // ✅ AUDIO: lưu local trên host
            provider = "local";

            const audioDir = path.join(process.cwd(), "uploads", "audio");
            await fsp.mkdir(audioDir, { recursive: true });

            const safeFile =
                `${Date.now()}-${Math.random().toString(16).slice(2)}` +
                `.${ext}`;
            const destAbs = path.join(audioDir, safeFile);

            // move tmp -> uploads/audio
            await fsp.rename(req.file.path, destAbs);

            // lưu relative path vào DB
            storagePath = path.posix.join("uploads", "audio", safeFile);
        } else if (ext === "mp4") {
            provider = "local";

            const videoDir = path.join(process.cwd(), "uploads", "video");
            await fsp.mkdir(videoDir, { recursive: true });

            const safeName =
                `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
            const dest = path.join(videoDir, safeName);

            await fsp.rename(req.file.path, dest);

            storagePath = path.posix.join("uploads", "video", safeName);
        } else {
            return res
                .status(400)
                .json({ message: "only pptx/docx/audio supported for now" });
        }
    } finally {
        // nếu là google thì file tmp vẫn còn -> xoá
        // còn audio thì đã rename nên path cũ không còn
        if (provider === "google") {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to remove local file:", err);
            });
        }
    }

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

        provider,

        // google
        google:
            provider === "google"
                ? {
                    fileId: googleMeta.fileId,
                    previewUrl: googleMeta.previewUrl,
                    webViewLink: googleMeta.webViewLink,
                    kind: googleMeta.kind, // 'slides' | 'docs'
                }
                : null,

        // local
        storagePath: provider === "local" ? storagePath : "",
    });

    const populated = await Material.findById(doc._id).populate(
        "uploaderId",
        "name email role"
    );
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

// async function getEmbed(req, res) {
//     const ok = await canAccessMaterial(req.user, req.params.id);
//     if (!ok) return res.status(403).json({ message: "forbidden" });

//     const doc = await Material.findById(req.params.id);
//     if (!doc || !doc.isActive)
//         return res.status(404).json({ message: "not found" });

//     const g = doc.google || {};
//     const fileId = g.fileId;
//     let slideData = [];

//     let previewUrl = g.previewUrl || "";

//     if (doc.ext === "pptx" && fileId) {
//         try {
//             const slides = getSlides();

//             const presentation = await slides.presentations.get({
//                 presentationId: fileId,
//             });

//             slideData = await Promise.all(
//                 presentation.data.slides.map(async (slide, index) => {
//                     const thumb = await slides.presentations.pages.getThumbnail({
//                         presentationId: fileId,
//                         pageObjectId: slide.objectId,
//                     });

//                     return {
//                         index: index + 1,
//                         objectId: slide.objectId,
//                         thumbnailUrl: thumb.data.contentUrl // Link ảnh thực tế
//                     };
//                 })
//             );
//         } catch (err) {
//             console.error("Lỗi lấy thông tin slide:", err);
//         }

//         // previewUrl = `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
//     }

//     // docs => preview
//     if (g.kind === "docs" && fileId) {
//         previewUrl = `https://docs.google.com/document/d/${fileId}/preview`;
//     }

//     console.log(g.kind);

//     if (g.kind === "audio" && fileId) {
//         // trả link public để FE gắn vào <audio src>
//         previewUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
//     }

//     // ✅ log MATERIAL_VIEW (đừng để log làm fail request)
//     try {
//         await writeLog(req, "MATERIAL_VIEW", {
//             materialId: doc._id,
//             folderId: doc.folderId || null,
//             meta: {
//                 title: doc.title || "",
//                 originalName: doc.originalName || "",
//                 ext: doc.ext || "",
//                 provider: doc.provider || "",
//                 kind: g.kind || "",
//                 googleFileId: fileId || "",
//             },
//         });
//     } catch (e) {
//         console.error("writeLog MATERIAL_VIEW failed:", e?.message || e);
//     }

//     return res.json({ previewUrl, slideData });
// }

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

async function streamAudio(req, res) {
    const ok = await canAccessMaterial(req.user, req.params.id);
    if (!ok) return res.status(403).json({ message: "forbidden" });

    const doc = await Material.findById(req.params.id);
    if (!doc || !doc.isActive) return res.status(404).json({ message: "not found" });
    if (doc.provider !== "local") return res.status(400).json({ message: "not a local file" });

    const rel = doc.storagePath || "";
    if (!rel) return res.status(400).json({ message: "missing storagePath" });

    const filePath = path.join(process.cwd(), rel); // rel: uploads/audio/xxx.mp3
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "file missing" });

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader("Content-Type", doc.mimeType || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store"); // tránh 304 làm player đứng

    if (!range) {
        res.setHeader("Content-Length", fileSize);
        fs.createReadStream(filePath).pipe(res);
        return;
    }

    // Range: bytes=start-end
    const m = String(range).match(/bytes=(\d+)-(\d*)/);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : fileSize - 1;

    if (start >= fileSize) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
        return;
    }

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Content-Length", end - start + 1);

    fs.createReadStream(filePath, { start, end }).pipe(res);
}

function parseGoogleDriveLink(url) {
    if (!url) return null;

    const u = url.trim();

    // docs
    let m = u.match(/docs\.google\.com\/document\/d\/([^/]+)/);
    if (m) {
        return {
            kind: "docs",
            sourceUrl: `https://docs.google.com/document/d/${m[1]}`,
            fileId: m[1],
        };
    }

    // slides
    m = u.match(/docs\.google\.com\/presentation\/d\/([^/]+)/);
    if (m) {
        return {
            kind: "slides",
            sourceUrl: `https://docs.google.com/presentation/d/${m[1]}`,
            fileId: m[1],
        };
    }

    // sheets
    m = u.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
    if (m) {
        return {
            kind: "sheets",
            sourceUrl: `https://docs.google.com/spreadsheets/d/${m[1]}`,
            fileId: m[1],
        };
    }

    return null;
}

async function uploadGoogleMaterial(req, res) {
    const { title, sourceUrl, folderId } = req.body;
    if (req.user.role !== "admin") return res.sendStatus(403);

    let perm;
    try {
        perm = await inheritFolderPermission(folderId);
    } catch (e) {
        return res.status(e.status || 400).json({ message: e.message || "invalid folderId" });
    }

    const {
        kind,
        fileId,
    } = parseGoogleDriveLink(sourceUrl);

    if (!sourceUrl || !kind)
        return res.status(400).json({ message: "sourceUrl & kind required" });

    // extract fileId
    const m = sourceUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return res.status(400).json({ message: "invalid google link" });

    // const fileId = m[1];

    const doc = await Material.create({
        title: title.trim(),
        provider: "google",
        google: {
            fileId,
            kind,
            sourceUrl,
        },
        uploaderId: req.user._id,
        folderId: folderId || null,
        visibility: perm.visibility,
        allowTeacherIds: perm.allowTeacherIds,
    });

    return res.status(201).json({ material: doc });
}

async function uploadLocalMaterial(req, res) {
    if (!req.file) return res.status(400).json({ message: "file required" });

    const { folderId } = req.body || {};
    let perm;
    try {
        perm = await inheritFolderPermission(folderId);
    } catch (e) {
        return res.status(e.status || 400).json({ message: e.message || "invalid folderId" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isAudio = [".mp3", ".wav", ".m4a", ".ogg"].includes(ext);
    const isVideo = [".mp4", ".webm"].includes(ext);
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (!isAudio && !isVideo && !isImage)
        return res.status(400).json({ message: "unsupported file" });

    const baseDir = isAudio
        ? "uploads/audio"
        : isVideo
            ? "uploads/video"
            : "uploads/image";

    await fsp.mkdir(baseDir, { recursive: true });

    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    const dest = path.join(baseDir, safeName);

    await fsp.rename(req.file.path, dest);

    const doc = await Material.create({
        title: req.body.title || req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        provider: "local",
        storagePath: dest.replace(/\\/g, "/"),
        uploaderId: req.user._id,
        folderId: req.body.folderId || null,
        visibility: perm.visibility,
        allowTeacherIds: perm.allowTeacherIds,
    });

    res.status(201).json({ material: doc });
}

async function serveLocalFile(req, res) {
    const doc = await Material.findById(req.params.id);
    if (!doc || doc.provider !== "local") return res.sendStatus(404);

    res.sendFile(path.resolve(doc.storagePath));
}

async function getEmbed(req, res) {
    const ok = await canAccessMaterial(req.user, req.params.id);
    if (!ok) return res.status(403).json({ message: "forbidden" });

    const doc = await Material.findById(req.params.id);
    if (!doc || !doc.isActive) return res.sendStatus(404);

    const g = doc.google || {};

    if (req.user.role === 'teacher') {
        try {
            await writeLog(req, "MATERIAL_VIEW", {
                materialId: doc._id,
                folderId: doc.folderId || null,
                meta: {
                    title: doc.title || "",
                    ext: doc.ext || "",
                    provider: doc.provider || "",
                    kind: g.kind || "",
                    googleFileId: g.fileId || "",
                },
            });
        } catch (e) {
            console.error("writeLog MATERIAL_VIEW failed:", e?.message || e);
        }
    }

    if (doc.provider === "google") {
        const { fileId, kind } = doc.google;

        let previewUrl = "";

        if (kind === "slides") {
            previewUrl = `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
        } else if (kind === "docs") {
            previewUrl = `https://docs.google.com/document/d/${fileId}/preview`;
        } else if (kind === "sheets") {
            previewUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
        }

        return res.json({ previewUrl });
    }

    // local
    return res.json({
        previewUrl: `/api/materials/${doc._id}/file`,
        mimeType: doc.mimeType,
    });
}

// tuỳ bạn mở rộng
const AUDIO_EXT = new Set(["mp3", "wav", "m4a", "ogg"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function getExtFromName(name = "") {
    const ext = path.extname(String(name)).toLowerCase();
    return ext.startsWith(".") ? ext.slice(1) : ext; // "mp3"
}

function randomSafeName(ext) {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
}

function toPosix(p) {
    return String(p || "").split(path.sep).join(path.posix.sep);
}

async function inheritFolderPermission(folderId) {
    let finalFolderId = folderId ? String(folderId) : null;
    let visibility = "public";
    let allowTeacherIds = [];

    if (finalFolderId) {
        const folder = await Folder.findOne({ _id: finalFolderId, isActive: true }).select(
            "_id visibility allowTeacherIds"
        );
        if (!folder) {
            const err = new Error("invalid folderId");
            err.status = 400;
            throw err;
        }
        visibility = folder.visibility || "public";
        allowTeacherIds = Array.isArray(folder.allowTeacherIds) ? folder.allowTeacherIds : [];
    }

    return { finalFolderId, visibility, allowTeacherIds };
}

// ✅ UPLOAD MANY LOCAL
async function uploadManyLocalMaterials(req, res) {
    if (req.user.role !== "admin") return res.status(403).json({ message: "forbidden" });
    if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "files is required" });
    }

    const { folderId } = req.body || {};
    let perm;
    try {
        perm = await inheritFolderPermission(folderId);
    } catch (e) {
        return res.status(e.status || 400).json({ message: e.message || "invalid folderId" });
    }

    const results = [];

    // chạy tuần tự để đỡ vỡ RAM/IO (và dễ debug)
    for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        // nếu FE gửi titles[i] hoặc displayTitles[] thì lấy ở đây
        // ✅ tương thích 2 kiểu:
        // - displayTitles[] (array)
        // - displayTitles["<filename>"] (tuỳ bạn)
        const displayTitles = req.body?.displayTitles || req.body?.titles || [];
        const title =
            (Array.isArray(displayTitles) ? displayTitles[i] : "") ||
            req.body?.title || // fallback
            "";

        const originalName = file.originalname;
        const ext = getExtFromName(originalName);

        const fileName = String(title || originalName).trim();

        // validate loại local cho phép
        const isAudio = AUDIO_EXT.has(ext);
        const isVideo = VIDEO_EXT.has(ext);
        const isImage = IMAGE_EXT.has(ext);

        if (!isAudio && !isVideo && !isImage) {
            // dọn tmp
            try { await fsp.unlink(file.path); } catch { }
            results.push({
                index: i,
                ok: false,
                originalName,
                error: `file not supported: .${ext}`,
            });
            continue;
        }

        try {
            const subDir = isAudio ? "audio" : isVideo ? "video" : "images";
            const destDir = path.join(process.cwd(), "uploads", subDir);
            await fsp.mkdir(destDir, { recursive: true });

            const safeName = randomSafeName(ext);
            const destAbs = path.join(destDir, safeName);

            // move tmp -> uploads
            await fsp.rename(file.path, destAbs);

            const storagePath = toPosix(path.posix.join("uploads", subDir, safeName));

            const doc = await Material.create({
                title: fileName,
                originalName,
                mimeType: file.mimetype,
                ext,
                size: file.size,

                uploaderId: req.user._id,
                folderId: perm.finalFolderId,

                visibility: perm.visibility,
                allowTeacherIds: perm.allowTeacherIds,

                isActive: true,

                provider: "local",
                google: null,
                storagePath,
            });

            results.push({
                index: i,
                ok: true,
                material: doc,
            });
        } catch (e) {
            // dọn tmp nếu còn
            try { await fsp.unlink(file.path); } catch { }
            results.push({
                index: i,
                ok: false,
                originalName,
                error: e.message || "upload failed",
            });
        }
    }

    return res.status(201).json({
        items: results,
        successCount: results.filter((x) => x.ok).length,
        failCount: results.filter((x) => !x.ok).length,
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
    patchMaterialPermissions,
    streamAudio,
    uploadGoogleMaterial,
    uploadLocalMaterial,
    uploadManyLocalMaterials,
    serveLocalFile
};