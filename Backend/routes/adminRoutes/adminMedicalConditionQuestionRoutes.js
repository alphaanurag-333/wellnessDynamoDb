const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const {
  listMedicalConditionQuestionsController,
  getMedicalConditionQuestionByIdController,
  createMedicalConditionQuestionController,
  updateMedicalConditionQuestionController,
  deleteMedicalConditionQuestionController,
} = require("../../controllers/adminController/medicalConditionQuestionController");

const router = express.Router();

router.get("/", protectAdmin, listMedicalConditionQuestionsController);
router.get("/:id", protectAdmin, getMedicalConditionQuestionByIdController);
router.post("/", protectAdmin, createMedicalConditionQuestionController);
router.patch("/:id", protectAdmin, updateMedicalConditionQuestionController);
router.delete("/:id", protectAdmin, deleteMedicalConditionQuestionController);

module.exports = router;
