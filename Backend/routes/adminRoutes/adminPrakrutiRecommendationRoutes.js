const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listPrakrutiRecommendationsController,
  getPrakrutiRecommendationByIdController,
  createPrakrutiRecommendationController,
  updatePrakrutiRecommendationController,
  deletePrakrutiRecommendationController,
} = require("../../controllers/adminController/prakrutiRecommendationController");

const router = express.Router();

router.get(
  "/",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "prakruti-recommendations.view" }),
  listPrakrutiRecommendationsController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "prakruti-recommendations.view" }),
  getPrakrutiRecommendationByIdController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "prakruti-recommendations.edit" }),
  createPrakrutiRecommendationController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "prakruti-recommendations.edit" }),
  updatePrakrutiRecommendationController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "prakruti-recommendations.delete" }),
  deletePrakrutiRecommendationController
);

module.exports = router;
