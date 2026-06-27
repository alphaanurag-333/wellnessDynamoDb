const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getProgramForUserController,
  listPlansController,
  previewOrderController,
  createOrderController,
  verifyPaymentController,
  listSubscriptionsController,
} = require("../../controllers/userController/energyExchangeController");

const router = express.Router();

router.use(protectUser);

router.get("/program", getProgramForUserController);
router.get("/plans", listPlansController);
router.post("/preview", previewOrderController);
router.post("/order", createOrderController);
router.post("/verify", verifyPaymentController);
router.get("/subscriptions", listSubscriptionsController);

module.exports = router;
