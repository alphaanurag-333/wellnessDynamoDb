const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const {
  listCoachConsultancyTransactionsController,
  listCoachConsultancyEnrolledUsersController,
  getCoachConsultancyTransactionController,
  getCoachConsultancyInvoiceController,
  getCoachConsultancyClientController,
  updateCoachConsultancyClientController,
} = require("../../controllers/wellnessCoachController/consultancyTransactionController");

const router = express.Router();

router.use(protectWellnessCoach);

router.get("/transactions", listCoachConsultancyTransactionsController);
router.get("/enrolled-users", listCoachConsultancyEnrolledUsersController);
router.get("/clients/:userId", getCoachConsultancyClientController);
router.patch("/transactions/:id", updateCoachConsultancyClientController);
router.get("/transactions/:id/invoice", getCoachConsultancyInvoiceController);
router.get("/transactions/:id", getCoachConsultancyTransactionController);

module.exports = router;
