const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { optionalCofounderMessageFiles } = require("../../middleware/authMultipart");
const {
  getCofounderMessageController,
  createCofounderMessageController,
  updateCofounderMessageController,
} = require("../../controllers/adminController/cofounderMessageController");

const router = express.Router();

router.get("/", protectAdmin, getCofounderMessageController);
router.post("/", protectAdmin, optionalCofounderMessageFiles, createCofounderMessageController);
router.patch("/", protectAdmin, optionalCofounderMessageFiles, updateCofounderMessageController);

module.exports = router;
