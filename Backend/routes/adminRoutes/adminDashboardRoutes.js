const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { getDashboardStatistics } = require("../../controllers/adminController/dashboardController");

const router = express.Router();

router.get("/statistics", protectAdmin, getDashboardStatistics);

module.exports = router;
