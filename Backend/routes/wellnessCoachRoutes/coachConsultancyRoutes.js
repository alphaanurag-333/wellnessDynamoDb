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
  authorize("nav.consultancy/transactions"),
  listCoachConsultancyTransactionsController
);
router.get(
  "/enrolled-users",
  authorize("nav.consultancy/enrolled-users"),
  listCoachConsultancyEnrolledUsersController
);
router.get(
  "/clients/:userId",
  authorize("nav.consultancy/enrolled-users"),
  getCoachConsultancyClientController
);
router.patch(
  "/transactions/:id",
  authorize("nav.consultancy/transactions"),
  updateCoachConsultancyClientController
);
router.get(
  "/transactions/:id/invoice",
  authorize("nav.consultancy/transactions"),
  getCoachConsultancyInvoiceController
);
router.get(
  "/transactions/:id",
  authorize("nav.consultancy/transactions"),
  getCoachConsultancyTransactionController
);

module.exports = router;
