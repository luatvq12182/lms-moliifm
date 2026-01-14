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
const allowedExt = new Set([".pptx", ".pdf", ".docx", ".ppt", ".doc", ".xlsx", ".xls"]);
function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExt.has(ext)) return cb(new Error("file type not allowed"));
    cb(null, true);
}

const uploadMaterial = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

module.exports = { uploadMaterial };