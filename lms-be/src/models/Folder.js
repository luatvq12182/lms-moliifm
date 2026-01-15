const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

FolderSchema.index({ parentId: 1, isActive: 1 });

module.exports = mongoose.model("Folder", FolderSchema);