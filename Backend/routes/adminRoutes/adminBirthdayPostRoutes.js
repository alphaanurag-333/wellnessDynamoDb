const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listBirthdayPostsController,
  getBirthdayPostByIdController,
  updateBirthdayPostController,
  deleteBirthdayPostCommentController,
} = require("../../controllers/adminController/birthdayPostController");

const router = express.Router();

router.get("/", protectAdmin, listBirthdayPostsController);
router.get("/:id", protectAdmin, getBirthdayPostByIdController);
router.patch("/:id", protectAdmin, updateBirthdayPostController);
router.delete("/:postId/comments/:commentId", protectAdmin, deleteBirthdayPostCommentController);

module.exports = router;
