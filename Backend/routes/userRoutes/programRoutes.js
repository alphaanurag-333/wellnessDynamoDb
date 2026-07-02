const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  getProgramForUserController,
  previewOrderController,
  createOrderController,
  verifyPaymentController,
} = require("../../controllers/userController/programController");

const router = express.Router();

router.use(protectUser);

router.get("/", getProgramForUserController);
router.post("/preview", previewOrderController);
router.post("/order", createOrderController);
router.post("/verify", verifyPaymentController);

module.exports = router;
