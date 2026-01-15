const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true, minlength: 2 },
        avatarUrl: { type: String, default: "" },
        email: { type: String, trim: true, lowercase: true, unique: true, required: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["admin", "teacher"], default: "teacher" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

UserSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.statics.hashPassword = async function (plain) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
};

UserSchema.methods.toSafeJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

module.exports = mongoose.model("User", UserSchema);