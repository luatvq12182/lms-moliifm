const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true, minlength: 2 },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
        teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

ClassSchema.index({ courseId: 1 });
ClassSchema.index({ teacherIds: 1 });

module.exports = mongoose.model("Class", ClassSchema);