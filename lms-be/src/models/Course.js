const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true, minlength: 2 },
    },
    { timestamps: true }
);

CourseSchema.index({ name: 1 });

module.exports = mongoose.model("Course", CourseSchema);