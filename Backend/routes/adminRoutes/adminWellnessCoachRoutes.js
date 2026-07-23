const express = require("express");

const { protectAdmin } = require("../../middleware/auth");
const { authorize } = require("../../middleware/authorize");
const { optionalWellnessCoachFile } = require("../../middleware/authMultipart");
const {
  listWellnessCoachesController,
  getWellnessCoachByIdController,
  createWellnessCoachController,
  updateWellnessCoachController,
  deleteWellnessCoachController,
} = require("../../controllers/adminController/wellnessCoachController");
const { listHealUsersByCoachController } = require("../../controllers/adminController/userAssignmentController");

const router = express.Router();

router.get("/", protectAdmin, authorize("coaches.view"), listWellnessCoachesController);
router.post(
  "/",
  protectAdmin,
  authorize("coaches.edit"),
  optionalWellnessCoachFile,
  createWellnessCoachController
);
router.get("/:id", protectAdmin, authorize("coaches.view"), getWellnessCoachByIdController);
router.patch(
  "/:id",
  protectAdmin,
  authorize("coaches.edit"),
  optionalWellnessCoachFile,
  updateWellnessCoachController
);
router.delete("/:id", protectAdmin, authorize("coaches.delete"), deleteWellnessCoachController);

router.get("/:coachId/heal-users", protectAdmin, authorize("coaches.view"), listHealUsersByCoachController);

module.exports = router;
