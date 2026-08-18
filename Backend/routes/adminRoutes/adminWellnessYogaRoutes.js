const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const { optionalWellnessYogaFile } = require("../../middleware/authMultipart");
const { previewYoutubeDurationController } = require("../../controllers/adminController/wellnessLibraryMetaController");
const {
  listWellnessYogaController,
  getWellnessYogaByIdController,
  createWellnessYogaController,
  updateWellnessYogaController,
  deleteWellnessYogaController,
} = require("../../controllers/adminController/wellnessYogaController");

const router = express.Router();

router.get(
  "/",
  protectAccount,
  authorizeStaff(["console.cf.view", "console.diet.view"], {
    admin: ["wellness-yoga.view", "users.clientHub.wellness.yoga"],
    coach: "clientTab.wellness.yoga",
  }),
  listWellnessYogaController
);
router.get(
  "/youtube-duration",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "wellness-yoga.edit" }),
  previewYoutubeDurationController
);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "wellness-yoga.view" }), getWellnessYogaByIdController);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "wellness-yoga.edit" }),
  optionalWellnessYogaFile,
  createWellnessYogaController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "wellness-yoga.edit" }),
  optionalWellnessYogaFile,
  updateWellnessYogaController
);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "wellness-yoga.delete" }), deleteWellnessYogaController);

module.exports = router;
