const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ["LOGIN", "MATERIAL_VIEW"],
            required: true,
            index: true,
        },

        // ai làm
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        userRole: { type: String, index: true }, // snapshot để filter nhanh
        userEmail: { type: String, index: true }, // snapshot

        // context
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", index: true },
        folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", index: true }, // nếu bạn có folder

        // request meta
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        referer: { type: String, default: "" },
        path: { type: String, default: "" },   // req.originalUrl
        method: { type: String, default: "" },

        // tuỳ chọn: lưu thêm parsed UA (nếu bạn muốn)
        ua: {
            browser: { type: String, default: "" },
            version: { type: String, default: "" },
            os: { type: String, default: "" },
            device: { type: String, default: "" },
        },

        // tuỳ chọn: payload nhỏ để sau này mở rộng
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

// index thời gian để query nhanh
ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);