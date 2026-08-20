const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getReferralOverviewController,
  getReferralTreeController,
} = require("../../controllers/adminController/referralTreeController");

const router = express.Router();
const canViewTree = authorizeStaff("console.rt.view");

router.get("/overview", protectAccount, canViewTree, getReferralOverviewController);
router.get("/", protectAccount, canViewTree, getReferralTreeController);

module.exports = router;
