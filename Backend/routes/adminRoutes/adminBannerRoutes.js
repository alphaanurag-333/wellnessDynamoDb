const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalBannerFile } = require("../../middleware/authMultipart");
const {
  listBannersController,
  getBannerByIdController,
  createBannerController,
  updateBannerController,
  deleteBannerController,
  reorderBannersController,
} = require("../../controllers/adminController/bannerController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.bn.view", { admin: "banners.view" }), listBannersController);
router.put("/reorder", protectAccount, authorizeStaff("console.bn.edit", { admin: "banners.edit" }), reorderBannersController);
router.get("/:id", protectAccount, authorizeStaff("console.bn.view", { admin: "banners.view" }), getBannerByIdController);
router.post("/", protectAccount, authorizeStaff("console.bn.edit", { admin: "banners.edit" }), optionalBannerFile, createBannerController);
router.patch("/:id", protectAccount, authorizeStaff("console.bn.edit", { admin: "banners.edit" }), optionalBannerFile, updateBannerController);
router.delete("/:id", protectAccount, authorizeStaff("console.bn.delete", { admin: "banners.delete" }), deleteBannerController);

module.exports = router;
