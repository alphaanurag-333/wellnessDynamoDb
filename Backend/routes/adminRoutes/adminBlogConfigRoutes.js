const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  getBlogConfigController,
  createBlogConfigController,
  updateBlogConfigController,
} = require("../../controllers/adminController/blogConfigController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "blog-config.view" }), getBlogConfigController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-config.edit" }), createBlogConfigController);
router.patch("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "blog-config.edit" }), updateBlogConfigController);

module.exports = router;
