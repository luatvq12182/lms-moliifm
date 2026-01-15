const fs = require("fs");
const path = require("path");
const multer = require("multer");

const dir = path.join(__dirname, "..", "..", "uploads", "avatars");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

function fileFilter(req, file, cb) {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    if (!ok) return cb(new Error("Avatar chỉ hỗ trợ JPG/PNG/WEBP"));
    cb(null, true);
}

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});