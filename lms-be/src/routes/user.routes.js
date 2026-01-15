const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const requireSelfOrAdmin = require("../middleware/requireSelfOrAdmin");
const uploadAvatar = require("../middleware/uploadAvatar");
const {
    getMe,
    updateMe,
    adminCreateUser,
    adminListUsers,
    adminGetUser,
    updateUser,
    updateMyAvatar,
    updateUserAvatarByAdmin
} = require("../controllers/user.controller");

router.use(auth);

router.get("/me", getMe);
router.patch("/me", updateMe);

// admin only
router.post("/", requireRole("admin"), adminCreateUser);
router.get("/", requireRole("admin"), adminListUsers);
router.get("/:id", requireRole("admin"), adminGetUser);

// user tự đổi avatar
router.post("/me/avatar", uploadAvatar.single("avatar"), updateMyAvatar);

// admin đổi avatar cho user bất kỳ
router.post("/:id/avatar", uploadAvatar.single("avatar"), updateUserAvatarByAdmin);

// admin or self
router.patch("/:id", requireSelfOrAdmin("id"), updateUser);

module.exports = router;