const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getCheckoutPreviewController,
  createConsultancyOrderController,
  verifyConsultancyPaymentController,
  listMyConsultancyTransactionsController,
  getMyConsultancyTransactionController,
  getMyConsultancyInvoiceController,
} = require("../../controllers/userController/consultancyPaymentController");

const router = express.Router();

router.use(protectUser);

router.get("/checkout-preview", getCheckoutPreviewController);
router.post("/orders", createConsultancyOrderController);
router.post("/verify", verifyConsultancyPaymentController);
router.get("/transactions", listMyConsultancyTransactionsController);
router.get("/transactions/:id", getMyConsultancyTransactionController);
router.get("/transactions/:id/invoice", getMyConsultancyInvoiceController);

module.exports = router;
