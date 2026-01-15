const ClassModel = require("../models/Class"); // chỉnh path đúng
const mongoose = require("mongoose");

async function getTeacherAccessIds(userId) {
    const uid = new mongoose.Types.ObjectId(String(userId));

    const classes = await ClassModel.find({
        isActive: true,
        teacherIds: uid,
    }).select("_id courseId");

    const allowedClassIds = classes.map((c) => c._id);
    const allowedCourseIds = [...new Set(classes.map((c) => String(c.courseId)).filter(Boolean))]
        .map((id) => new mongoose.Types.ObjectId(id));

    return { allowedClassIds, allowedCourseIds };
}

function scopeMatch(folder, payload) {
    // payload: { scope, courseId, classId, folderId } của file hoặc folder
    if (!folder) return true;

    // folder public => chỉ cho scope public
    if (folder.scope === "public") return payload.scope === "public";

    if (folder.scope === "course") {
        return payload.scope === "course" && String(payload.courseId || "") === String(folder.courseId || "");
    }

    if (folder.scope === "class") {
        return payload.scope === "class" && String(payload.classId || "") === String(folder.classId || "");
    }

    return false;
}

module.exports = { getTeacherAccessIds, scopeMatch };