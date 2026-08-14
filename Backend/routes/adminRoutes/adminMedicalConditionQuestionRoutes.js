const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
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
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "medical-condition-questions.view" }),
  listMedicalConditionQuestionsController
);
router.get(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.view", { admin: "medical-condition-questions.view" }),
  getMedicalConditionQuestionByIdController
);
router.post(
  "/",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "medical-condition-questions.edit" }),
  createMedicalConditionQuestionController
);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "medical-condition-questions.edit" }),
  updateMedicalConditionQuestionController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "medical-condition-questions.delete" }),
  deleteMedicalConditionQuestionController
);

module.exports = router;
