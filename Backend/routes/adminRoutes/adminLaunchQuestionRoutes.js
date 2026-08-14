const express = require("express");

const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listLaunchQuestionsController,
  getLaunchQuestionByIdController,
  createLaunchQuestionController,
  updateLaunchQuestionController,
  deleteLaunchQuestionController,
} = require("../../controllers/adminController/launchQuestionController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "launch-questions.view" }), listLaunchQuestionsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "launch-questions.view" }), getLaunchQuestionByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "launch-questions.edit" }), createLaunchQuestionController);
router.patch("/:id", protectAccount, authorizeStaff("console.cf.edit", { admin: "launch-questions.edit" }), updateLaunchQuestionController);
router.delete("/:id", protectAccount, authorizeStaff("console.cf.delete", { admin: "launch-questions.delete" }), deleteLaunchQuestionController);

module.exports = router;
