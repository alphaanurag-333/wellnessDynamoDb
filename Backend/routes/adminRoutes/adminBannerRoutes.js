const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalBannerFile } = require("../../middleware/authMultipart");
const {
  listBannersController,
  getBannerByIdController,
  createBannerController,
  updateBannerController,
  deleteBannerController,
} = require("../../controllers/adminController/bannerController");

const router = express.Router();

router.get("/", protectAdmin, authorize("banners.view"), listBannersController);
router.get("/:id", protectAdmin, authorize("banners.view"), getBannerByIdController);
router.post("/", protectAdmin, authorize("banners.edit"), optionalBannerFile, createBannerController);
router.patch("/:id", protectAdmin, authorize("banners.edit"), optionalBannerFile, updateBannerController);
router.delete("/:id", protectAdmin, authorize("banners.delete"), deleteBannerController);

module.exports = router;
