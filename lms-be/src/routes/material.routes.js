const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { uploadMaterial } = require("../config/upload");
const ctrl = require("../controllers/material.controller");

router.use(auth);

router.get("/", ctrl.listMaterials);

// ✅ upload admin-only
router.post("/upload", requireRole("admin"), uploadMaterial.single("file"), ctrl.uploadMaterial);

router.patch("/:id", requireRole("admin"), ctrl.updateMaterial);
router.delete("/:id", requireRole("admin"), ctrl.deleteMaterial);

router.get("/:id/file", ctrl.downloadFile);
router.get("/:id/embed", ctrl.getEmbed);

module.exports = router;