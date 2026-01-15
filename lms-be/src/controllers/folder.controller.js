const Folder = require("../models/Folder");
const Material = require("../models/Material");

// GET /api/folders?parentId=&q=
exports.listFolders = async (req, res) => {
    const { parentId = "", q = "" } = req.query;

    const filter = {
        isActive: true,
        parentId: parentId ? parentId : null,
    };

    if (q.trim()) filter.name = { $regex: q.trim(), $options: "i" };

    const folders = await Folder.find(filter).sort({ name: 1 }).lean();
    res.json({ folders });
};

exports.createFolder = async (req, res) => {
    const { name, parentId = null } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ message: "name is required" });

    // validate parent
    if (parentId) {
        const parent = await Folder.findOne({ _id: parentId, isActive: true });
        if (!parent) return res.status(404).json({ message: "parent not found" });
    }

    const folder = await Folder.create({
        name: String(name).trim(),
        parentId: parentId || null,
        createdBy: req.user._id,
    });

    res.status(201).json({ folder });
};

exports.updateFolder = async (req, res) => {
    const { id } = req.params;
    const { name, parentId } = req.body || {};

    const folder = await Folder.findOne({ _id: id, isActive: true });
    if (!folder) return res.status(404).json({ message: "not found" });

    if (typeof name === "string" && name.trim()) folder.name = name.trim();

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