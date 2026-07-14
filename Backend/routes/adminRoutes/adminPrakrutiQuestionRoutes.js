const express = require("express");
const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const {
  listPrakrutiQuestionsController,
  getPrakrutiQuestionByIdController,
  createPrakrutiQuestionController,
  updatePrakrutiQuestionController,
  deletePrakrutiQuestionController,
} = require("../../controllers/adminController/prakrutiQuestionController");

const router = express.Router();

router.get("/", protectAdmin, authorize("prakruti-questions.view"), listPrakrutiQuestionsController);
router.get("/:id", protectAdmin, authorize("prakruti-questions.view"), getPrakrutiQuestionByIdController);
router.post("/", protectAdmin, authorize("prakruti-questions.edit"), createPrakrutiQuestionController);
router.patch(
  "/:id",
  protectAdmin,
  authorize("prakruti-questions.edit"),
  updatePrakrutiQuestionController
);
router.delete(
  "/:id",
  protectAdmin,
  authorize("prakruti-questions.delete"),
  deletePrakrutiQuestionController
);

module.exports = router;
