const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalCofounderMessageFiles } = require("../../middleware/authMultipart");
const {
  getCofounderMessageController,
  createCofounderMessageController,
  updateCofounderMessageController,
} = require("../../controllers/adminController/cofounderMessageController");

const router = express.Router();

router.get("/", protectAdmin, authorize("cofounder-message.view"), getCofounderMessageController);
router.post(
  "/",
  protectAdmin,
  authorize("cofounder-message.edit"),
  optionalCofounderMessageFiles,
  createCofounderMessageController
);
router.patch(
  "/",
  protectAdmin,
  authorize("cofounder-message.edit"),
  optionalCofounderMessageFiles,
  updateCofounderMessageController
);

module.exports = router;
