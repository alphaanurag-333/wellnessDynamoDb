const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listMedicalConditionQuestionsController,
  getMedicalConditionQuestionByIdController,
  createMedicalConditionQuestionController,
  updateMedicalConditionQuestionController,
  deleteMedicalConditionQuestionController,
} = require("../../controllers/adminController/medicalConditionQuestionController");

const router = express.Router();

router.get(
  "/",
  protectAdmin,
  authorize("medical-condition-questions.view"),
  listMedicalConditionQuestionsController
);
router.get(
  "/:id",
  protectAdmin,
  authorize("medical-condition-questions.view"),
  getMedicalConditionQuestionByIdController
);
router.post(
  "/",
  protectAdmin,
  authorize("medical-condition-questions.edit"),
  createMedicalConditionQuestionController
);
router.patch(
  "/:id",
  protectAdmin,
  authorize("medical-condition-questions.edit"),
  updateMedicalConditionQuestionController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("medical-condition-questions.delete"),
  deleteMedicalConditionQuestionController
);

module.exports = router;
