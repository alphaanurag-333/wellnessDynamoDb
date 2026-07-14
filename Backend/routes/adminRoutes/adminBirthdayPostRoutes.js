const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listBirthdayPostsController,
  getBirthdayPostByIdController,
  updateBirthdayPostController,
  deleteBirthdayPostCommentController,
} = require("../../controllers/adminController/birthdayPostController");

const router = express.Router();

router.get("/", protectAdmin, authorize("birthday-posts.view"), listBirthdayPostsController);
router.get("/:id", protectAdmin, authorize("birthday-posts.view"), getBirthdayPostByIdController);
router.patch("/:id", protectAdmin, authorize("birthday-posts.edit"), updateBirthdayPostController);
router.delete(
  "/:postId/comments/:commentId",
  protectAdmin,
  authorize("birthday-posts.delete"),
  deleteBirthdayPostCommentController
);

module.exports = router;
