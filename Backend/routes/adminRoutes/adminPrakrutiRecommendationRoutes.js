const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listPrakrutiRecommendationsController,
  getPrakrutiRecommendationByIdController,
  createPrakrutiRecommendationController,
  updatePrakrutiRecommendationController,
  deletePrakrutiRecommendationController,
} = require("../../controllers/adminController/prakrutiRecommendationController");

const router = express.Router();

router.get("/", protectAdmin, listPrakrutiRecommendationsController);
router.get("/:id", protectAdmin, getPrakrutiRecommendationByIdController);
router.post("/", protectAdmin, createPrakrutiRecommendationController);
router.patch("/:id", protectAdmin, updatePrakrutiRecommendationController);
router.delete("/:id", protectAdmin, deletePrakrutiRecommendationController);

module.exports = router;
