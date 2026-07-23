const express = require("express");
const { protectWellnessCoach } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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

router.get(
  "/transactions",
  authorize("consultancy.transactions.view"),
  listCoachConsultancyTransactionsController
);
router.get(
  "/enrolled-users",
  authorize("consultancy.enrolled-users.view"),
  listCoachConsultancyEnrolledUsersController
);
router.get(
  "/clients/:userId",
  authorize("consultancy.enrolled-users.view"),
  getCoachConsultancyClientController
);
router.patch(
  "/transactions/:id",
  authorize("consultancy.transactions.view"),
  updateCoachConsultancyClientController
);
router.get(
  "/transactions/:id/invoice",
  authorize("consultancy.transactions.view"),
  getCoachConsultancyInvoiceController
);
router.get(
  "/transactions/:id",
  authorize("consultancy.transactions.view"),
  getCoachConsultancyTransactionController
);

module.exports = router;
