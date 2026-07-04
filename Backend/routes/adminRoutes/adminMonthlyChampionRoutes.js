const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listMonthlyChampionPostsController,
  getMonthlyChampionPostByIdController,
  updateMonthlyChampionPostController,
  deleteMonthlyChampionPostCommentController,
  runMonthlyChampionJobController,
} = require("../../controllers/adminController/monthlyChampionController");

const router = express.Router();

router.get("/", protectAdmin, listMonthlyChampionPostsController);
router.post("/jobs/run", protectAdmin, runMonthlyChampionJobController);
router.get("/:id", protectAdmin, getMonthlyChampionPostByIdController);
router.patch("/:id", protectAdmin, updateMonthlyChampionPostController);
router.delete("/:postId/comments/:commentId", protectAdmin, deleteMonthlyChampionPostCommentController);

module.exports = router;
