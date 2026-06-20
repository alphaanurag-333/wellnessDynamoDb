const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listAdminConsultancyTransactionsController,
  getAdminConsultancyTransactionController,
  getAdminConsultancyInvoiceController,
  listAdminEnrolledUsersController,
} = require("../../controllers/adminController/consultancyTransactionController");

const router = express.Router();

router.get("/transactions", protectAdmin, listAdminConsultancyTransactionsController);
router.get("/transactions/:id", protectAdmin, getAdminConsultancyTransactionController);
router.get("/transactions/:id/invoice", protectAdmin, getAdminConsultancyInvoiceController);
router.get("/enrolled-users", protectAdmin, listAdminEnrolledUsersController);

module.exports = router;
