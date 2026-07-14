const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listLaunchQuestionsController,
  getLaunchQuestionByIdController,
  createLaunchQuestionController,
  updateLaunchQuestionController,
  deleteLaunchQuestionController,
} = require("../../controllers/adminController/launchQuestionController");

const router = express.Router();

router.get("/", protectAdmin, authorize("launch-questions.view"), listLaunchQuestionsController);
router.get("/:id", protectAdmin, authorize("launch-questions.view"), getLaunchQuestionByIdController);
router.post("/", protectAdmin, authorize("launch-questions.edit"), createLaunchQuestionController);
router.patch("/:id", protectAdmin, authorize("launch-questions.edit"), updateLaunchQuestionController);
router.delete("/:id", protectAdmin, authorize("launch-questions.delete"), deleteLaunchQuestionController);

module.exports = router;
