const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const ctrl = require("../controllers/course.controller");

router.use(auth);

// list: admin/teacher đều gọi được (teacher bị filter)
router.get("/", ctrl.listCourses);

// admin CRUD
router.post("/", requireRole("admin"), ctrl.createCourse);
router.get("/:id", requireRole("admin"), ctrl.getCourse);
router.patch("/:id", requireRole("admin"), ctrl.updateCourse);
router.delete("/:id", requireRole("admin"), ctrl.deleteCourse);

module.exports = router;