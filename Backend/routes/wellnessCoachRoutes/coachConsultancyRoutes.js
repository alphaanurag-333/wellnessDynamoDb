const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachConsultancyTransactionsController,
  listCoachConsultancyEnrolledUsersController,
  getCoachConsultancyTransactionController,
  getCoachConsultancyInvoiceController,
} = require("../../controllers/wellnessCoachController/consultancyTransactionController");

const router = express.Router();

router.use(protectWellnessCoach);

router.get("/transactions", listCoachConsultancyTransactionsController);
router.get("/enrolled-users", listCoachConsultancyEnrolledUsersController);
router.get("/transactions/:id/invoice", getCoachConsultancyInvoiceController);
router.get("/transactions/:id", getCoachConsultancyTransactionController);

module.exports = router;
