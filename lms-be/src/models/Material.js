const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },

        provider: { type: String, enum: ["google", "local"], required: true },

        // ===== google =====
        google: {
            fileId: { type: String, default: null },
            kind: {
                type: String,
                enum: ["slides", "docs", "sheets"],
                default: null,
            },
            sourceUrl: { type: String, default: "" }, // link gốc user nhập
        },

        // ===== local =====
        storagePath: { type: String, default: "" },

        uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },

        visibility: { type: String, enum: ["public", "restricted"], default: "public" },
        allowTeacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Material", MaterialSchema);