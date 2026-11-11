const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getReferralOverviewController,
  getReferralTreeController,
  patchUserReferralUsedController,
} = require("../../controllers/adminController/referralTreeController");

const router = express.Router();
const canViewTree = authorizeStaff("console.rt.view");
const canEditReferralUsed = authorizeStaff("console.cl.edit", { admin: "users.edit" });

router.get("/overview", protectAccount, canViewTree, getReferralOverviewController);
router.get("/", protectAccount, canViewTree, getReferralTreeController);
router.patch(
  "/users/:userId/referred-by",
  protectAccount,
  canEditReferralUsed,
  patchUserReferralUsedController
);

module.exports = router;
