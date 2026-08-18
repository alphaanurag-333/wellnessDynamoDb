const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalBlogPostFile } = require("../../middleware/authMultipart");
const {
  listBlogPostsController,
  getBlogPostByIdController,
  createBlogPostController,
  updateBlogPostController,
  deleteBlogPostController,
  reorderBlogPostsController,
} = require("../../controllers/adminController/blogPostController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "blog-posts.view" }), listBlogPostsController);
router.put("/reorder", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-posts.edit" }), reorderBlogPostsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "blog-posts.view" }), getBlogPostByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-posts.edit" }), optionalBlogPostFile, createBlogPostController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-posts.edit" }), optionalBlogPostFile, updateBlogPostController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-posts.delete" }), deleteBlogPostController);

module.exports = router;
