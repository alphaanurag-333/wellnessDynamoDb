const express = require("express");
const { protectUser } = require("../../middleware/auth");
const {
  listPublishedChallengesController,
  getPublishedChallengeController,
  listMyChallengeEnrollmentsController,
  previewChallengePaymentController,
  createChallengeOrderController,
  verifyChallengePaymentController,
  validateChallengeCouponController,
} = require("../../controllers/userController/challengeController");

const router = express.Router();

router.use(protectUser);

router.get("/", listPublishedChallengesController);
router.get("/me", listMyChallengeEnrollmentsController);
router.post("/coupons/validate", validateChallengeCouponController);
router.get("/:id", getPublishedChallengeController);
router.post("/:id/payment/preview", previewChallengePaymentController);
router.post("/:id/payment/create-order", createChallengeOrderController);
router.post("/:id/payment/verify", verifyChallengePaymentController);

module.exports = router;
