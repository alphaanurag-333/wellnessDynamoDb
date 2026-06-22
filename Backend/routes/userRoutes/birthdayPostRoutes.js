const express = require("express");

const { protectUser } = require("../../middleware/auth");
const {
  listBirthdayPostsController,
  getBirthdayPostByIdController,
} = require("../../controllers/userController/birthdayPostController");
const {
  listBirthdayPostCommentsController,
  createBirthdayPostCommentController,
  deleteBirthdayPostCommentController,
} = require("../../controllers/userController/birthdayPostCommentController");

const router = express.Router();

router.use(protectUser);

router.get("/", listBirthdayPostsController);
router.get("/:postId/comments", listBirthdayPostCommentsController);
router.post("/:postId/comments", createBirthdayPostCommentController);
router.delete("/:postId/comments/:id", deleteBirthdayPostCommentController);
router.get("/:id", getBirthdayPostByIdController);

module.exports = router;
