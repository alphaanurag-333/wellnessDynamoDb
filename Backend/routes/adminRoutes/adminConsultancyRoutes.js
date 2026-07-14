const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listAdminConsultancyTransactionsController,
  getAdminConsultancyTransactionController,
  getAdminConsultancyInvoiceController,
  listAdminEnrolledUsersController,
} = require("../../controllers/adminController/consultancyTransactionController");

const router = express.Router();

router.get(
  "/transactions",
  protectAdmin,
  authorize("consultancy.transactions.view"),
  listAdminConsultancyTransactionsController
);
router.get(
  "/transactions/:id",
  protectAdmin,
  authorize("consultancy.transactions.view"),
  getAdminConsultancyTransactionController
);
router.get(
  "/transactions/:id/invoice",
  protectAdmin,
  authorize("consultancy.transactions.view"),
  getAdminConsultancyInvoiceController
);
router.get(
  "/enrolled-users",
  protectAdmin,
  authorize("consultancy.enrolled-users.view"),
  listAdminEnrolledUsersController
);

module.exports = router;
