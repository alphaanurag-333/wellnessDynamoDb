const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const {
  listPrakrutiQuestionsController,
  getPrakrutiQuestionByIdController,
  createPrakrutiQuestionController,
  updatePrakrutiQuestionController,
  deletePrakrutiQuestionController,
} = require("../../controllers/adminController/prakrutiQuestionController");

const router = express.Router();

router.get("/", protectAdmin, listPrakrutiQuestionsController);
router.get("/:id", protectAdmin, getPrakrutiQuestionByIdController);
router.post("/", protectAdmin, createPrakrutiQuestionController);
router.patch("/:id", protectAdmin, updatePrakrutiQuestionController);
router.delete("/:id", protectAdmin, deletePrakrutiQuestionController);

module.exports = router;
