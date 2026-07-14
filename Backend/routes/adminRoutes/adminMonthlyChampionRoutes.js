const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listMonthlyChampionPostsController,
  getMonthlyChampionPostByIdController,
  updateMonthlyChampionPostController,
  deleteMonthlyChampionPostCommentController,
  runMonthlyChampionJobController,
} = require("../../controllers/adminController/monthlyChampionController");

const router = express.Router();

router.get("/", protectAdmin, authorize("monthly-champions.view"), listMonthlyChampionPostsController);
router.post("/jobs/run", protectAdmin, authorize("monthly-champions.edit"), runMonthlyChampionJobController);
router.get(
  "/:id",
  protectAdmin,
  authorize("monthly-champions.view"),
  getMonthlyChampionPostByIdController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("monthly-champions.edit"),
  updateMonthlyChampionPostController
);
router.delete(
  "/:postId/comments/:commentId",
  protectAdmin,
  authorize("monthly-champions.delete"),
  deleteMonthlyChampionPostCommentController
);

module.exports = router;
