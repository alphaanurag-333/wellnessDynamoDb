const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalManagingDirectorMessageFiles } = require("../../middleware/authMultipart");
const {
  getManagingDirectorMessageController,
  createManagingDirectorMessageController,
  updateManagingDirectorMessageController,
} = require("../../controllers/adminController/managingDirectorMessageController");

const router = express.Router();

router.get("/", protectAdmin, getManagingDirectorMessageController);
router.post("/", protectAdmin, optionalManagingDirectorMessageFiles, createManagingDirectorMessageController);
router.patch("/", protectAdmin, optionalManagingDirectorMessageFiles, updateManagingDirectorMessageController);

module.exports = router;
