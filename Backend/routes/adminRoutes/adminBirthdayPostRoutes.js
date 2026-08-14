const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listBirthdayPostsController,
  getBirthdayPostByIdController,
  updateBirthdayPostController,
  deleteBirthdayPostCommentController,
} = require("../../controllers/adminController/birthdayPostController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.ct.view", { admin: "birthday-posts.view" }), listBirthdayPostsController);
router.get("/:id", protectAccount, authorizeStaff("console.ct.view", { admin: "birthday-posts.view" }), getBirthdayPostByIdController);
router.patch("/:id", protectAccount, authorizeStaff("console.ct.edit", { admin: "birthday-posts.edit" }), updateBirthdayPostController);
router.delete(
  "/:postId/comments/:commentId",
  protectAccount,
  authorizeStaff("console.ct.delete", { admin: "birthday-posts.delete" }),
  deleteBirthdayPostCommentController
);

module.exports = router;
