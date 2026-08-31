const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  lookupCoachCheckoutClientController,
  listCoachCheckoutStaffController,
  listRecentPwcController,
  listCoachCheckoutHistoryController,
  getCoachCheckoutInvoiceController,
  getCoachCheckoutInvoiceShareController,
  remindCoachCheckoutController,
  triggerCoachCheckoutController,
} = require("../../controllers/adminController/coachCheckoutController");

const router = express.Router();

router.use(protectAccount);

router.get("/clients", lookupCoachCheckoutClientController);
router.get("/staff", listCoachCheckoutStaffController);
router.get("/pwc", listRecentPwcController);
router.get("/transactions", listCoachCheckoutHistoryController);
router.post(
  "/transactions/:id/remind",
  authorizeStaff("console.pg.edit", {
    admin: "programs.edit",
    wellness_coach: "nav.my-users",
  }),
  remindCoachCheckoutController
);
router.get("/transactions/:id/invoice", getCoachCheckoutInvoiceController);
router.get("/transactions/:id/share", getCoachCheckoutInvoiceShareController);
router.post(
  "/trigger",
  authorizeStaff("console.pg.edit", {
    admin: "programs.edit",
    wellness_coach: "nav.my-users",
  }),
  triggerCoachCheckoutController
);

module.exports = router;
