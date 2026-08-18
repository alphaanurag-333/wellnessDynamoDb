const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  lookupCoachCheckoutClientController,
  listCoachCheckoutStaffController,
  listRecentPwcController,
  triggerCoachCheckoutController,
} = require("../../controllers/adminController/coachCheckoutController");

const router = express.Router();

router.use(protectAccount);

router.get("/clients", lookupCoachCheckoutClientController);
router.get("/staff", listCoachCheckoutStaffController);
router.get("/pwc", listRecentPwcController);
router.post(
  "/trigger",
  authorizeStaff("console.pg.edit", {
    admin: "programs.edit",
    wellness_coach: "nav.my-users",
  }),
  triggerCoachCheckoutController
);

module.exports = router;
