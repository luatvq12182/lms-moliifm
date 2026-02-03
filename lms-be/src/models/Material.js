const mongoose = require("mongoose");

const GoogleSlideSchema = new mongoose.Schema(
    {
        index: { type: Number, required: true },          // thứ tự slide
        slideId: { type: String, required: true },        // p1, p2, ...
        thumbnailPath: { type: String, default: "" },     // /uploads/slides/{materialId}/p1.png
        thumbnailUrl: { type: String, default: "" },      // public URL
    },
    { _id: false }
);

const MaterialSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },

        provider: {
            type: String,
            enum: ["google", "local"],
            required: true,
        },

        // ===== GOOGLE =====
        google: {
            fileId: { type: String, default: null },

            kind: {
                type: String,
                enum: ["slides", "pptx", "docs", "sheets"],
                default: null,
            },

            sourceUrl: { type: String, default: "" },

            lastKnownMimeType: {
                type: String,
                default: "",
            },

            // ===== slides only =====
            slides: {
                type: [GoogleSlideSchema],
                default: [],
            },

            slidesSynced: {
                type: Boolean,
                default: false,
            },

            slidesSyncStatus: {
                type: String,
                enum: [
                    "pending",
                    "syncing",
                    "done",
                    "not_slides",
                    "error",
                ],
                default: "pending",
            },

            slidesRetryCount: {
                type: Number,
                default: 0,
            },

            slidesLastError: {
                type: String,
                default: "",
            },

            slidesSyncedAt: {
                type: Date,
                default: null,
            },
        },

        // ===== LOCAL =====
        storagePath: { type: String, default: "" },

        uploaderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        folderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null,
        },

        visibility: {
            type: String,
            enum: ["public", "restricted"],
            default: "public",
        },

        allowTeacherIds: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        ],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Material", MaterialSchema);
