const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listCoachConsultancyTransactionsController,
  listCoachConsultancyEnrolledUsersController,
  getCoachConsultancyTransactionController,
  getCoachConsultancyInvoiceController,
  getCoachConsultancyClientController,
  updateCoachConsultancyClientController,
} = require("../../controllers/staff/consultancyTransactionController");
const {
  listAdminConsultancyTransactionsController,
  getAdminConsultancyTransactionController,
  getAdminConsultancyInvoiceController,
  listAdminEnrolledUsersController,
} = require("../../controllers/adminController/consultancyTransactionController");
const { resolveStaffActor } = require("../../controllers/staffAccess");

const router = express.Router();
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

function byRole(adminHandler, coachHandler) {
  return (req, res, next) => {
    try {
      const actor = resolveStaffActor(req);
      if (actor.role === "admin") return adminHandler(req, res, next);
      return coachHandler(req, res, next);
    } catch (err) {
      return next(err);
    }
  };
}

const txView = authorizeStaff("console.cal.view", {
  admin: "consultancy.transactions.view",
  wellness_coach: "nav.consultancy/transactions",
  assistant_wellness_coach: "nav.consultancy/transactions",
  trainee: "nav.consultancy/transactions",
});
const enrolledView = authorizeStaff("console.cal.view", {
  admin: "consultancy.enrolled-users.view",
  wellness_coach: "nav.consultancy/enrolled-users",
  assistant_wellness_coach: "nav.consultancy/enrolled-users",
  trainee: "nav.consultancy/enrolled-users",
});

router.get("/transactions", txView, byRole(listAdminConsultancyTransactionsController, listCoachConsultancyTransactionsController));
router.get("/enrolled-users", enrolledView, byRole(listAdminEnrolledUsersController, listCoachConsultancyEnrolledUsersController));
router.get("/clients/:userId", enrolledView, getCoachConsultancyClientController);
router.patch(
  "/transactions/:id",
  authorizeStaff("console.cal.edit", { admin: "consultancy.transactions.view", wellness_coach: "nav.consultancy/transactions" }),
  updateCoachConsultancyClientController
);
router.get("/transactions/:id/invoice", txView, byRole(getAdminConsultancyInvoiceController, getCoachConsultancyInvoiceController));
router.get("/transactions/:id", txView, byRole(getAdminConsultancyTransactionController, getCoachConsultancyTransactionController));

module.exports = router;
