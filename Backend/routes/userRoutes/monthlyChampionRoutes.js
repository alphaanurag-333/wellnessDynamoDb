const express = require("express");

const { protectUser } = require("../../middleware/auth");
const {
  listUserMonthlyChampionsController,
  getMyMonthlyChampionHistoryController,
  getUserMonthlyChampionByIdController,
} = require("../../controllers/userController/monthlyChampionController");
const {
  listMonthlyChampionCommentsController,
  createMonthlyChampionCommentController,
  deleteMonthlyChampionCommentController,
} = require("../../controllers/userController/monthlyChampionCommentController");

const router = express.Router();

router.use(protectUser);

router.get("/", listUserMonthlyChampionsController);
router.get("/mine", getMyMonthlyChampionHistoryController);
router.get("/:postId/comments", listMonthlyChampionCommentsController);
router.post("/:postId/comments", createMonthlyChampionCommentController);
router.delete("/:postId/comments/:id", deleteMonthlyChampionCommentController);
router.get("/:id", getUserMonthlyChampionByIdController);

module.exports = router;
