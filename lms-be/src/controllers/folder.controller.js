const mongoose = require("mongoose");
const Folder = require("../models/Folder");
const Material = require("../models/Material");

// GET /api/folders?parentId=&q=
exports.listFolders = async (req, res) => {
    const { parentId = "" } = req.query;
    const isAdmin = req.user.role === "admin";

    const filter = { isActive: true, parentId: parentId ? parentId : null };

    if (isAdmin) {
        const folders = await Folder.find(filter).sort({ name: 1 });
        return res.json({ folders });
    }

    // teacher: public OR (restricted mà mình nằm trong allowTeacherIds)
    const folders = await Folder.find({
        ...filter,
        $or: [
            { visibility: "public" },
            { visibility: "restricted", allowTeacherIds: req.user._id },
        ],
    }).sort({ name: 1 });

    return res.json({ folders });
};

function normalizeAllowIds(v) {
    // FE gửi JSON: allowTeacherIds: ["id1","id2"]
    if (Array.isArray(v)) return v;
    // trường hợp form-data: allowTeacherIds[] lặp nhiều lần
    if (v && typeof v === "object" && Array.isArray(v["allowTeacherIds[]"])) return v["allowTeacherIds[]"];
    // trường hợp 1 string
    if (typeof v === "string" && v.trim()) return [v.trim()];
    return [];
}

exports.createFolder = async (req, res) => {
    // chỉ admin tạo
    if (req.user.role !== "admin") return res.status(403).json({ message: "forbidden" });

    const { name, parentId, visibility } = req.body || {};
    const allowRaw = req.body?.allowTeacherIds ?? req.body?.["allowTeacherIds[]"];

    if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });

    // validate parent
    let finalParentId = null;
    if (parentId) {
        const parent = await Folder.findOne({ _id: parentId, isActive: true }).select("_id");
        if (!parent) return res.status(404).json({ message: "parent not found" });
        finalParentId = parent._id;
    }

    // ✅ quyền
    const finalVisibility = visibility === "restricted" ? "restricted" : "public";

    let allowTeacherIds = normalizeAllowIds(allowRaw)
        .map(String)
        .filter(Boolean)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    if (finalVisibility === "public") allowTeacherIds = [];

    const folder = await Folder.create({
        name: String(name).trim(),
        parentId: finalParentId,
        visibility: finalVisibility,
        allowTeacherIds,
        isActive: true,
        createdBy: req.user._id,
    });

    return res.status(201).json({ folder });
};

exports.updateFolder = async (req, res) => {
    const { id } = req.params;
    const { name, parentId, visibility, allowTeacherIds } = req.body || {};

    const folder = await Folder.findOne({ _id: id, isActive: true });
    if (!folder) return res.status(404).json({ message: "not found" });

    // name
    if (typeof name === "string" && name.trim()) folder.name = name.trim();

    // move folder
    if (parentId !== undefined) {
        if (!parentId) {
            folder.parentId = null;
        } else {
            const parent = await Folder.findOne({ _id: parentId, isActive: true });
            if (!parent) return res.status(404).json({ message: "parent not found" });
            if (String(parent._id) === String(folder._id)) {
                return res.status(400).json({ message: "cannot move into itself" });
            }
            folder.parentId = parent._id;
        }
    }

    // ✅ permissions
    if (visibility !== undefined) {
        if (!["public", "restricted"].includes(visibility)) {
            return res.status(400).json({ message: "invalid visibility" });
        }
        folder.visibility = visibility;

        // nếu chuyển về public thì clear list
        if (visibility === "public") {
            folder.allowTeacherIds = [];
        }
    }

    // allowTeacherIds chỉ có ý nghĩa khi restricted
    if (allowTeacherIds !== undefined) {
        // cho phép truyền [] để xoá hết
        if (!Array.isArray(allowTeacherIds)) {
            return res.status(400).json({ message: "allowTeacherIds must be array" });
        }
        // cast về string để tránh ObjectId lẫn lộn
        const uniq = Array.from(new Set(allowTeacherIds.map(String))).filter(Boolean);
        folder.allowTeacherIds = uniq;
        // nếu có list => auto restricted cho chắc
        folder.visibility = "restricted";
    }

    await folder.save();
    res.json({ folder });
};

exports.deleteFolder = async (req, res) => {
    const { id } = req.params;

    const folder = await Folder.findOne({ _id: id, isActive: true });
    if (!folder) return res.status(404).json({ message: "not found" });

    // cascade delete (soft)
    const queue = [folder._id];
    const allFolderIds = [];

    while (queue.length) {
        const cur = queue.shift();
        allFolderIds.push(cur);

        const children = await Folder.find({ parentId: cur, isActive: true }).select("_id");
        for (const c of children) queue.push(c._id);
    }

    await Folder.updateMany({ _id: { $in: allFolderIds } }, { $set: { isActive: false } });
    await Material.updateMany({ folderId: { $in: allFolderIds } }, { $set: { isActive: false } });

    res.json({ ok: true });
};

exports.getFolderPath = async (req, res) => {
    const { id } = req.params;

    let cur = await Folder.findOne({ _id: id, isActive: true }).lean();
    if (!cur) return res.status(404).json({ message: "not found" });

    const path = [];
    while (cur) {
        path.push({ _id: cur._id, name: cur.name });
        if (!cur.parentId) break;
        cur = await Folder.findOne({ _id: cur.parentId, isActive: true }).lean();
    }

    path.reverse();
    res.json({ path });
};

exports.patchFolderPermissions = async (req, res) => {
    if (req.user.role !== "admin")
        return res.status(403).json({ message: "admin only" });

    const { visibility, allowTeacherIds } = req.body || {};
    if (!["public", "restricted"].includes(visibility))
        return res.status(400).json({ message: "invalid visibility" });

    const doc = await Folder.findById(req.params.id);
    if (!doc || !doc.isActive) return res.status(404).json({ message: "not found" });

    doc.visibility = visibility;
    doc.allowTeacherIds = visibility === "restricted" ? (allowTeacherIds || []) : [];
    await doc.save();

    return res.json({ folder: doc });
}
