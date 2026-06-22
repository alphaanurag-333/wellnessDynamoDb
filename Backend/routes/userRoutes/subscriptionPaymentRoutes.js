const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getSubscriptionCheckoutPreviewController,
  createSubscriptionOrderController,
  verifySubscriptionPaymentController,
  listMySubscriptionTransactionsController,
  getMySubscriptionTransactionController,
} = require("../../controllers/userController/subscriptionPaymentController");

const router = express.Router();

router.use(protectUser);

router.get("/checkout-preview", getSubscriptionCheckoutPreviewController);
router.post("/orders", createSubscriptionOrderController);
router.post("/verify", verifySubscriptionPaymentController);
router.get("/transactions", listMySubscriptionTransactionsController);
router.get("/transactions/:id", getMySubscriptionTransactionController);

module.exports = router;
