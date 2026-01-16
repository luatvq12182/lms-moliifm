const router = require("express").Router();
const ctrl = require("../controllers/folder.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(auth);

router.get("/", ctrl.listFolders);
router.get("/:id/path", ctrl.getFolderPath);

router.post("/", requireRole("admin"), ctrl.createFolder);
router.patch("/:id", requireRole("admin"), ctrl.updateFolder);
router.patch("/:id/permissions", ctrl.patchFolderPermissions);
router.delete("/:id", requireRole("admin"), ctrl.deleteFolder);

module.exports = router;