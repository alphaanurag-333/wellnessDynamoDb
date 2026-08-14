const express = require("express");
const { protectAccount } = require("../../middleware/auth");
const { authorizeStaff } = require("../../middleware/authorize");
const {
  listPrakrutiQuestionsController,
  getPrakrutiQuestionByIdController,
  createPrakrutiQuestionController,
  updatePrakrutiQuestionController,
  deletePrakrutiQuestionController,
} = require("../../controllers/adminController/prakrutiQuestionController");

const router = express.Router();

router.get("/", protectAccount, authorizeStaff("console.cf.view", { admin: "prakruti-questions.view" }), listPrakrutiQuestionsController);
router.get("/:id", protectAccount, authorizeStaff("console.cf.view", { admin: "prakruti-questions.view" }), getPrakrutiQuestionByIdController);
router.post("/", protectAccount, authorizeStaff("console.cf.edit", { admin: "prakruti-questions.edit" }), createPrakrutiQuestionController);
router.patch(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.edit", { admin: "prakruti-questions.edit" }),
  updatePrakrutiQuestionController
);
router.delete(
  "/:id",
  protectAccount,
  authorizeStaff("console.cf.delete", { admin: "prakruti-questions.delete" }),
  deletePrakrutiQuestionController
);

module.exports = router;
