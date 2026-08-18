const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalBlogMediaFile } = require("../../middleware/authMultipart");
const {
  listBlogMediaController,
  getBlogMediaByIdController,
  createBlogMediaController,
  updateBlogMediaController,
  deleteBlogMediaController,
} = require("../../controllers/adminController/blogMediaController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "blog-media.view" }), listBlogMediaController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "blog-media.view" }), getBlogMediaByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-media.edit" }), optionalBlogMediaFile, createBlogMediaController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-media.edit" }), optionalBlogMediaFile, updateBlogMediaController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "blog-media.delete" }), deleteBlogMediaController);

module.exports = router;
