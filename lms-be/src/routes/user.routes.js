const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const requireSelfOrAdmin = require("../middleware/requireSelfOrAdmin");
const {
    getMe,
    updateMe,
    adminCreateUser,
    adminListUsers,
    adminGetUser,
    updateUser,
} = require("../controllers/user.controller");

router.use(auth);

router.get("/me", getMe);
router.patch("/me", updateMe);

// admin only
router.post("/", requireRole("admin"), adminCreateUser);
router.get("/", requireRole("admin"), adminListUsers);
router.get("/:id", requireRole("admin"), adminGetUser);

// admin or self
router.patch("/:id", requireSelfOrAdmin("id"), updateUser);

module.exports = router;