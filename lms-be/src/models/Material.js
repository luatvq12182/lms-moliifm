const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema(
    {
        title: { type: String, trim: true, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        ext: { type: String, trim: true },
        size: { type: Number, required: true },
        storagePath: { type: String, default: "" },
        uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        // ✅ folder ảo
        folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },

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