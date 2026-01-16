const Folder = require("../models/Folder");
const Material = require("../models/Material");

function isAllowedByDoc(userId, doc) {
    if (!doc) return false;
    if (doc.visibility === "public") return true;
    const arr = doc.allowTeacherIds || [];
    return arr.some((x) => String(x) === String(userId));
}

// ✅ check quyền folder (có thể kiểm tra chain parent nếu bạn muốn nâng cao)
async function canAccessFolder(user, folderId) {
    if (user.role === "admin") return true;
    if (!folderId) return true; // root

    const folder = await Folder.findOne({ _id: folderId, isActive: true }).select(
        "visibility allowTeacherIds parentId"
    );
    if (!folder) return false;

    // bản v1: quyền chỉ cần check tại folder đó
    return isAllowedByDoc(user._id, folder);
}

async function canAccessMaterial(user, materialId) {
    if (user.role === "admin") return true;

    const m = await Material.findOne({ _id: materialId, isActive: true }).select(
        "visibility allowTeacherIds folderId"
    );
    if (!m) return false;

    // nếu file public -> ok luôn
    if (m.visibility === "public") return true;

    // restricted: check allowTeacherIds
    if (isAllowedByDoc(user._id, m)) return true;

    // nếu file kế thừa folder (tuỳ bạn): check thêm folder
    if (m.folderId) return canAccessFolder(user, m.folderId);

    return false;
}

module.exports = { canAccessFolder, canAccessMaterial };