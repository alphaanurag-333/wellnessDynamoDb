const express = require("express");
const { protectAssistantWellnessCoach } = require("../../middleware/auth");
const {
  listAssistantConsultancyTransactionsController,
  listAssistantConsultancyEnrolledUsersController,
  getAssistantConsultancyTransactionController,
  getAssistantConsultancyInvoiceController,
} = require("../../controllers/assistantWellnessCoachController/consultancyTransactionController");

const router = express.Router();

router.use(protectAssistantWellnessCoach);

router.get("/transactions", listAssistantConsultancyTransactionsController);
router.get("/enrolled-users", listAssistantConsultancyEnrolledUsersController);
router.get("/transactions/:id/invoice", getAssistantConsultancyInvoiceController);
router.get("/transactions/:id", getAssistantConsultancyTransactionController);

module.exports = router;
