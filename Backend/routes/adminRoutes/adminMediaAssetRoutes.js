const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalMediaAssetFile } = require("../../middleware/authMultipart");
const {
  listMediaAssetsController,
  getMediaAssetByIdController,
  createMediaAssetController,
  updateMediaAssetController,
  restoreMediaAssetVersionController,
  deleteMediaAssetController,
} = require("../../controllers/adminController/mediaAssetController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "media-assets.view" }), listMediaAssetsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "media-assets.view" }), getMediaAssetByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "media-assets.edit" }), optionalMediaAssetFile, createMediaAssetController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "media-assets.edit" }), optionalMediaAssetFile, updateMediaAssetController);
router.post("/:id/restore", protectAccount, authorizeStaff("console.cf.edit", { admin: "media-assets.edit" }), restoreMediaAssetVersionController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "media-assets.delete" }), deleteMediaAssetController);

module.exports = router;
