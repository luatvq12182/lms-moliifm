const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema(
    {
        title: { type: String, trim: true, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        ext: { type: String, trim: true },
        size: { type: Number, required: true },
        storagePath: { type: String, required: true },
        uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        // NEW: scope phân quyền
        scope: { type: String, enum: ["public", "course", "class"], default: "class", index: true },

        // NEW: gắn vào course/class tuỳ scope
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null, index: true },
        classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null, index: true },

        google: {
            fileId: { type: String, default: null },
            previewUrl: { type: String, default: null },
            webViewLink: { type: String, default: null },
        },
        provider: { type: String, enum: ["local", "google"], default: "local" },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Material", MaterialSchema);