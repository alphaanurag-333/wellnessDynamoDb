const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { getDashboardStatistics } = require("../../controllers/adminController/dashboardController");

const router = express.Router();

router.get("/statistics", protectAdmin, authorize("dashboard.view"), getDashboardStatistics);

module.exports = router;
