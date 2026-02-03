const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { uploadLocal } = require("../config/upload"); // đổi tên cho rõ
const ctrl = require("../controllers/material.controller");

router.use(auth);

// ================== LIST ==================
router.get("/", ctrl.listMaterials);
router.get("/:id/thumbnail/:thumb_id/:index", ctrl.getThumbnail);
// ================== UPLOAD ==================

// 🔹 1. GOOGLE MATERIAL (chỉ gửi link + title)
router.post(
    "/upload/google",
    requireRole("admin"),
    ctrl.uploadGoogleMaterial
);

// 🔹 2. LOCAL FILE (audio / video / image)
router.post(
    "/upload/local",
    requireRole("admin"),
    uploadLocal.single("file"),
    ctrl.uploadLocalMaterial
);

// 🔹 3. LOCAL FILE - upload nhiều
router.post(
    "/upload/local-many",
    requireRole("admin"),
    uploadLocal.array("files", 50),
    ctrl.uploadManyLocalMaterials
);

// ================== UPDATE ==================
router.patch("/:id", requireRole("admin"), ctrl.updateMaterial);
router.patch("/:id/permissions", requireRole("admin"), ctrl.patchMaterialPermissions);

// ================== DELETE ==================
router.delete("/:id", requireRole("admin"), ctrl.deleteMaterial);

// ================== VIEW ==================

// 🔹 dùng cho slide / doc / sheet / media
router.get("/:id/embed", ctrl.getEmbed);

// 🔹 serve file local (audio / video / image)
router.get("/:id/file", ctrl.serveLocalFile);

module.exports = router;