const express = require("express");
const { protectAccount, requireActiveRole } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { CLINICAL_ROLES } = require("../../controllers/staffAccess");
const {
  listConsultancyTransactionsController,
  listConsultancyEnrolledUsersController,
  getConsultancyTransactionController,
  getConsultancyInvoiceController,
  getCoachConsultancyClientController,
  updateCoachConsultancyClientController,
} = require("../../controllers/adminController/consultancyTransactionController");

const router = express.Router();
router.use(protectAccount, requireActiveRole(...CLINICAL_ROLES));

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

router.get("/transactions", txView, listConsultancyTransactionsController);
router.get("/enrolled-users", enrolledView, listConsultancyEnrolledUsersController);
router.get("/clients/:userId", enrolledView, getCoachConsultancyClientController);
router.patch(
  "/transactions/:id",
  authorizeStaff("console.cal.edit", { admin: "consultancy.transactions.view", wellness_coach: "nav.consultancy/transactions" }),
  updateCoachConsultancyClientController
);
router.get("/transactions/:id/invoice", txView, getConsultancyInvoiceController);
router.get("/transactions/:id", txView, getConsultancyTransactionController);

module.exports = router;
