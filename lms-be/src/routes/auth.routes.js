const router = require("express").Router();
const { login, bootstrapAdmin } = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/bootstrap-admin", bootstrapAdmin);

module.exports = router;