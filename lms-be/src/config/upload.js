const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

const uploadDir = path.join(process.cwd(), "uploads", "materials");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const name = crypto.randomBytes(16).toString("hex") + ext;
        cb(null, name);
    },
});

// allow pptx, pdf, docx + images (tuỳ bạn)
const allowedExt = new Set(
    [".pptx", ".pdf", ".docx", ".ppt", ".doc", ".xlsx", ".xls", ".mp3", ".wav", ".m4a", ".mp4"]
);

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExt.has(ext)) return cb(new Error("file type not allowed"));
    cb(null, true);
}

const uploadLocal = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

module.exports = { uploadLocal };