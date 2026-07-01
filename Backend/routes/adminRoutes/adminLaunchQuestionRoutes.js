const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listLaunchQuestionsController,
  getLaunchQuestionByIdController,
  createLaunchQuestionController,
  updateLaunchQuestionController,
  deleteLaunchQuestionController,
} = require("../../controllers/adminController/launchQuestionController");

const router = express.Router();

router.get("/", protectAdmin, listLaunchQuestionsController);
router.get("/:id", protectAdmin, getLaunchQuestionByIdController);
router.post("/", protectAdmin, createLaunchQuestionController);
router.patch("/:id", protectAdmin, updateLaunchQuestionController);
router.delete("/:id", protectAdmin, deleteLaunchQuestionController);

module.exports = router;
