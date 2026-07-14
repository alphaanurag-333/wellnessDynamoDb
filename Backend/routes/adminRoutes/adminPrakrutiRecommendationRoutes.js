const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
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
  protectAdmin,
  authorize("prakruti-recommendations.view"),
  listPrakrutiRecommendationsController
);
router.get(
  "/:id",
  protectAdmin,
  authorize("prakruti-recommendations.view"),
  getPrakrutiRecommendationByIdController
);
router.post(
  "/",
  protectAdmin,
  authorize("prakruti-recommendations.edit"),
  createPrakrutiRecommendationController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("prakruti-recommendations.edit"),
  updatePrakrutiRecommendationController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("prakruti-recommendations.delete"),
  deletePrakrutiRecommendationController
);

module.exports = router;
