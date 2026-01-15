const router = require("express").Router();
const { listLogs } = require("../controllers/activityLog.controller");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/activity-logs", auth, listLogs);

module.exports = router; 