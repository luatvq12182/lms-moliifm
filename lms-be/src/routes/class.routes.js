const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const ctrl = require("../controllers/class.controller");

router.use(auth);

// list: admin/teacher đều gọi được (teacher bị filter)
router.get("/", ctrl.listClasses);

// teacher/admin xem detail (teacher chỉ nếu được gán)
router.get("/:id", ctrl.getClass);

// admin CRUD
router.post("/", requireRole("admin"), ctrl.createClass);
router.patch("/:id", requireRole("admin"), ctrl.updateClass);
router.delete("/:id", requireRole("admin"), ctrl.deleteClass);

module.exports = router;